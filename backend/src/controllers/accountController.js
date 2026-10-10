const pool = require('../config/db');
const { urlImagen, getIgdbIdsDeSteam, getJuegosBasicos } = require('../services/igdbService');
const { ErrorSteam, resolverSteamId, getPerfil, getJuegosPoseidos, getLogros, getLogrosDetallados } = require('../services/steamService');
const { IDIOMAS, IDIOMA_ORIGINAL } = require('../services/traduccionService');

// imported_count: cuántos juegos de la biblioteca trajo la importación. El frontend lo
// enseña y avisa de que se borrarán al desvincular.
const COLUMNAS_CUENTA = `platform, external_id, display_name, avatar_url, profile_url, last_sync_at,
  (SELECT COUNT(*)::int FROM user_games g
   WHERE g.user_id = linked_accounts.user_id AND g.imported_from = linked_accounts.platform) AS imported_count`;

// Cuántas consultas de logros hago a la vez. Hay una por juego (cientos en una
// biblioteca grande): de una en una tardaría minutos, y todas de golpe podría
// saturar a Steam.
const LOGROS_EN_PARALELO = 8;

// Usuarios con una sincronización en marcha. Sincronizar tarda (muchas llamadas a
// Steam), y dos a la vez del mismo usuario se pisarían y gastarían peticiones de más.
// Está en memoria: vale mientras haya un único proceso de backend.
const sincronizando = new Set();

// Responde al error de Steam (con su mensaje y código) o, si es otra cosa, con un 500
function responderError(err, res, nombre) {
  if (err instanceof ErrorSteam) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(`Error en ${nombre}:`, err.response?.data || err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
}

// Ejecuta tarea(elemento) para cada elemento de la lista, pero con como mucho
// "limite" tareas a la vez: arranco "limite" trabajadores y cada uno va cogiendo
// el siguiente elemento pendiente hasta que no queda ninguno.
async function enParalelo(elementos, limite, tarea) {
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < elementos.length) {
      const elemento = elementos[siguiente++];
      await tarea(elemento);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, trabajador));
}

// GET /accounts — cuentas vinculadas del usuario. steam_disponible dice si el
// servidor tiene la clave de Steam, para que el frontend avise si falta.
async function listAccounts(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${COLUMNAS_CUENTA} FROM linked_accounts WHERE user_id = $1 ORDER BY created_at`,
      [req.user.id]
    );

    res.json({ accounts: result.rows, steam_disponible: Boolean(process.env.STEAM_API_KEY) });
  } catch (err) {
    responderError(err, res, 'listAccounts');
  }
}

// PUT /accounts/steam { perfil } — vincular la cuenta de Steam. "perfil" puede ser la
// URL del perfil, el nombre personalizado o el SteamID. Solo compruebo que el perfil
// existe y guardo su id: no se trae ningún juego hasta sincronizar. La sincronización
// siempre añade a la biblioteca los juegos de Steam que faltan (ya no es opcional) y
// desvincular los quita, así que la biblioteca vuelve a quedar como estaba.
async function linkSteam(req, res) {
  try {
    const steamId = await resolverSteamId(req.body?.perfil);
    const perfil = await getPerfil(steamId);

    const result = await pool.query(
      `INSERT INTO linked_accounts (user_id, platform, external_id, display_name, avatar_url, profile_url)
       VALUES ($1, 'steam', $2, $3, $4, $5)
       RETURNING ${COLUMNAS_CUENTA}`,
      [req.user.id, perfil.steamId, perfil.nombre, perfil.avatar, perfil.urlPerfil]
    );

    // "publico" es solo un aviso: se puede vincular un perfil privado, pero no se
    // podrá sincronizar hasta que lo abra
    res.status(201).json({ account: result.rows[0], publico: perfil.publico });
  } catch (err) {
    if (err.code === '23505') {
      // Salta el UNIQUE (user_id, platform). Para cambiar de cuenta hay que
      // desvincular antes, así el progreso de una no se mezcla con el de otra.
      return res.status(409).json({ error: 'Ya tienes una cuenta de Steam vinculada. Desvincúlala antes de vincular otra' });
    }
    responderError(err, res, 'linkSteam');
  }
}

// DELETE /accounts/steam — desvincular y dejar la biblioteca como estaba antes de
// vincular: borro los juegos que añadió la importación y, de los que ya tenía el
// usuario, quito el progreso que venía de Steam (horas y logros).
async function unlinkSteam(req, res) {
  // Si hay una sincronización en marcha, esta seguiría añadiendo juegos después de
  // borrarlos y quedarían huérfanos
  if (sincronizando.has(req.user.id)) {
    return res.status(409).json({ error: 'Ya hay una sincronización en curso' });
  }

  const client = await pool.connect();

  try {
    // Todo va en una transacción: o se hace todo o no se toca nada
    await client.query('BEGIN');

    const borrada = await client.query(
      "DELETE FROM linked_accounts WHERE user_id = $1 AND platform = 'steam' RETURNING id",
      [req.user.id]
    );

    if (borrada.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No tienes ninguna cuenta de Steam vinculada' });
    }

    const eliminados = await client.query(
      "DELETE FROM user_games WHERE user_id = $1 AND imported_from = 'steam'",
      [req.user.id]
    );

    await client.query(
      `UPDATE user_games
       SET steam_appid = NULL, playtime_minutes = NULL,
           achievements_unlocked = NULL, achievements_total = NULL
       WHERE user_id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Cuenta de Steam desvinculada', eliminados: eliminados.rowCount });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    responderError(err, res, 'unlinkSteam');
  } finally {
    client.release();
  }
}

// Trae de Steam las horas y los logros de un usuario. La usan el botón (POST
// /accounts/steam/sync) y la sincronización automática (services/sincronizacionAutomatica.js).
//  1. Pido a Steam los juegos de la cuenta.
//  2. Los emparejo con IGDB (mi biblioteca usa ids de IGDB, no de Steam).
//  3. A los que ya están en mi biblioteca les actualizo el progreso.
//  4. Añado los que me faltan (quedan marcados con imported_from = 'steam' para poder
//     quitarlos al desvincular).
// Devuelve { account, resumen }. Si no se puede (sin cuenta, ya hay una en curso,
// perfil privado...) lanza un ErrorSteam con su código HTTP.
async function sincronizarSteam(userId) {
  if (sincronizando.has(userId)) {
    throw new ErrorSteam('Ya hay una sincronización en curso', 409);
  }
  sincronizando.add(userId);

  try {
    const cuenta = await pool.query(
      "SELECT external_id FROM linked_accounts WHERE user_id = $1 AND platform = 'steam'",
      [userId]
    );
    if (cuenta.rows.length === 0) {
      throw new ErrorSteam('No tienes ninguna cuenta de Steam vinculada', 404);
    }
    const steamId = cuenta.rows[0].external_id;

    const poseidos = await getJuegosPoseidos(steamId);
    const igdbPorAppid = await getIgdbIdsDeSteam(poseidos.map((j) => j.appid));

    // Varios appid de Steam pueden ser el mismo juego de IGDB (ediciones, versiones
    // de prueba...). Me quedo con el que más se ha jugado.
    const porIgdb = new Map(); // igdbId -> juego de Steam
    for (const juego of poseidos) {
      const igdbId = igdbPorAppid.get(juego.appid);
      if (!igdbId) continue;
      const actual = porIgdb.get(igdbId);
      if (!actual || juego.playtime_forever > actual.playtime_forever) porIgdb.set(igdbId, juego);
    }
    const sinEmparejar = poseidos.filter((j) => !igdbPorAppid.has(j.appid)).length;

    const guardados = await pool.query('SELECT igdb_id FROM user_games WHERE user_id = $1', [userId]);
    const enBiblioteca = new Set(guardados.rows.map((r) => r.igdb_id));

    // Todos los juegos de Steam con equivalente en IGDB: los que ya tengo se
    // actualizan y los que faltan se añaden
    const objetivo = [...porIgdb];

    // Logros: solo de los juegos con horas (sin jugar no hay nada desbloqueado)
    const logros = new Map(); // igdbId -> { desbloqueados, total } | null
    await enParalelo(
      objetivo.filter(([, juego]) => juego.playtime_forever > 0),
      LOGROS_EN_PARALELO,
      async ([igdbId, juego]) => {
        logros.set(igdbId, await getLogros(steamId, juego.appid));
      }
    );

    // Un UPDATE para todos: unnest convierte varias listas en una tabla temporal
    // (una fila por posición) y el UPDATE ... FROM la une con user_games. Así hago
    // una sola consulta en vez de una por juego. COALESCE conserva lo que ya había
    // cuando no pude consultar los logros (NULL).
    const existentes = objetivo.filter(([igdbId]) => enBiblioteca.has(igdbId));
    const actualizados = await pool.query(
      `UPDATE user_games g
       SET steam_appid = d.appid,
           playtime_minutes = d.minutos,
           achievements_unlocked = COALESCE(d.desbloqueados, g.achievements_unlocked),
           achievements_total = COALESCE(d.total, g.achievements_total)
       FROM unnest($2::int[], $3::int[], $4::int[], $5::int[], $6::int[])
            AS d(igdb_id, appid, minutos, desbloqueados, total)
       WHERE g.user_id = $1 AND g.igdb_id = d.igdb_id`,
      [
        userId,
        existentes.map(([igdbId]) => igdbId),
        existentes.map(([, juego]) => juego.appid),
        existentes.map(([, juego]) => juego.playtime_forever),
        existentes.map(([igdbId]) => logros.get(igdbId)?.desbloqueados ?? null),
        existentes.map(([igdbId]) => logros.get(igdbId)?.total ?? null),
      ]
    );

    // Los que faltan: IGDB me da nombre y portada, que Steam no da en el formato que uso.
    // No pongo estado: Steam no sabe si te has pasado un juego, así que entran con el
    // que la BD da por defecto ('pendiente') y el usuario los marca a mano.
    let anadidos = 0;
    const faltan = objetivo.filter(([igdbId]) => !enBiblioteca.has(igdbId));
    if (faltan.length > 0) {
      const basicos = await getJuegosBasicos(faltan.map(([igdbId]) => igdbId));
      const nuevos = faltan.filter(([igdbId]) => basicos.has(igdbId));

      const insertados = await pool.query(
        `INSERT INTO user_games
           (user_id, igdb_id, name, cover_url, platform, imported_from,
            steam_appid, playtime_minutes, achievements_unlocked, achievements_total)
         SELECT $1::int, d.igdb_id, d.nombre, d.portada, 'Steam', 'steam',
                d.appid, d.minutos, d.desbloqueados, d.total
         FROM unnest($2::int[], $3::text[], $4::text[], $5::int[], $6::int[], $7::int[], $8::int[])
              AS d(igdb_id, nombre, portada, appid, minutos, desbloqueados, total)
         ON CONFLICT (user_id, igdb_id) DO NOTHING`,
        [
          userId,
          nuevos.map(([igdbId]) => igdbId),
          nuevos.map(([igdbId]) => basicos.get(igdbId).name),
          nuevos.map(([igdbId]) => {
            const imageId = basicos.get(igdbId).imageId;
            return imageId ? urlImagen(imageId, 't_cover_big') : null;
          }),
          nuevos.map(([, juego]) => juego.appid),
          nuevos.map(([, juego]) => juego.playtime_forever),
          nuevos.map(([igdbId]) => logros.get(igdbId)?.desbloqueados ?? null),
          nuevos.map(([igdbId]) => logros.get(igdbId)?.total ?? null),
        ]
      );
      anadidos = insertados.rowCount;
    }

    const cuentaActualizada = await pool.query(
      `UPDATE linked_accounts SET last_sync_at = NOW()
       WHERE user_id = $1 AND platform = 'steam'
       RETURNING ${COLUMNAS_CUENTA}`,
      [userId]
    );

    return {
      account: cuentaActualizada.rows[0],
      resumen: {
        poseidos: poseidos.length,
        actualizados: actualizados.rowCount,
        anadidos,
        sin_emparejar: sinEmparejar,
      },
    };
  } finally {
    sincronizando.delete(userId);
  }
}

// POST /accounts/steam/sync — el botón "Sincronizar ahora"
async function syncSteam(req, res) {
  try {
    res.json(await sincronizarSteam(req.user.id));
  } catch (err) {
    responderError(err, res, 'syncSteam');
  }
}

// GET /accounts/steam/games/:id/achievements?lang=es — la lista de logros de un
// juego de MI biblioteca. ":id" es el id de la fila de user_games (el mismo que
// usan PATCH y DELETE /games/:id), no el de IGDB ni el de Steam.
// No guardo la lista en la BD: cambia cada vez que el usuario desbloquea uno, así
// que se pide a Steam al abrir la ficha y siempre está al día.
async function getGameAchievements(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id debe ser un número entero positivo' });
  }

  const lang = req.query.lang ?? IDIOMA_ORIGINAL;
  if (typeof lang !== 'string' || !IDIOMAS.includes(lang)) {
    return res.status(400).json({ error: `lang debe ser uno de: ${IDIOMAS.join(', ')}` });
  }

  try {
    // El "AND user_id" es lo que impide pedir los logros de la biblioteca de otro:
    // un id ajeno no devuelve fila y responde igual que uno que no existe.
    // El JOIN trae a la vez el appid del juego y el SteamID de la cuenta vinculada.
    const result = await pool.query(
      `SELECT g.steam_appid, a.external_id
       FROM user_games g
       LEFT JOIN linked_accounts a ON a.user_id = g.user_id AND a.platform = 'steam'
       WHERE g.id = $1 AND g.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado en tu biblioteca' });
    }

    const { steam_appid: appid, external_id: steamId } = result.rows[0];
    if (!appid || !steamId) {
      return res.status(404).json({ error: 'Este juego no está vinculado con Steam' });
    }

    res.json({ achievements: await getLogrosDetallados(steamId, appid, lang) });
  } catch (err) {
    responderError(err, res, 'getGameAchievements');
  }
}

module.exports = { listAccounts, linkSteam, unlinkSteam, syncSteam, sincronizarSteam, getGameAchievements };
