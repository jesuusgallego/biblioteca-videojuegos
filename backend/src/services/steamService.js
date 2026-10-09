const axios = require('axios');

const API_STEAM = 'https://api.steampowered.com';

// Error con mensaje pensado para el usuario y el código HTTP con el que responder.
// Los controladores lo reconocen con "instanceof" y lo devuelven tal cual; cualquier
// otro error es un fallo inesperado (500).
class ErrorSteam extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

// Llamo a la Web API de Steam. La clave es de la propia app (una para todos los
// usuarios), vive solo en el servidor y nunca viaja al navegador.
// validateStatus: () => true hace que axios NO lance error con un 400 o un 403:
// Steam usa esos códigos para cosas normales (un juego sin logros responde 400) y
// prefiero decidir yo en cada función qué significa cada código.
async function steamGet(ruta, params) {
  const clave = process.env.STEAM_API_KEY;
  if (!clave) {
    throw new ErrorSteam('Steam no está configurado en el servidor', 503);
  }

  try {
    return await axios.get(`${API_STEAM}/${ruta}`, {
      params: { key: clave, ...params },
      timeout: 15000,
      validateStatus: () => true,
    });
  } catch {
    // Sin red, DNS, timeout... Descarto el error original a propósito: su
    // config incluye la URL con la clave y no quiero que acabe en un log.
    throw new ErrorSteam('No se pudo conectar con Steam', 502);
  }
}

// Fallos que no dependen de la petición concreta: Steam caído o clave rechazada
function exigirRespuestaValida(res) {
  if (res.status === 401 || res.status === 403) {
    throw new ErrorSteam('La clave de la API de Steam del servidor no es válida', 502);
  }
  if (res.status >= 500) {
    throw new ErrorSteam('Steam no responde ahora mismo', 502);
  }
}

// El usuario puede escribir su perfil de tres formas y las acepto todas:
//   - el SteamID de 17 dígitos:               76561198012345678
//   - la URL con ese número:                  steamcommunity.com/profiles/76561198012345678
//   - la URL (o el nombre) personalizado:     steamcommunity.com/id/miNombre  |  miNombre
// Devuelve el SteamID de 17 dígitos.
async function resolverSteamId(entrada) {
  if (typeof entrada !== 'string' || entrada.trim() === '') {
    throw new ErrorSteam('Indica tu perfil de Steam (URL, nombre de usuario o SteamID)', 400);
  }
  const texto = entrada.trim();

  if (/^\d{17}$/.test(texto)) return texto;

  const porId = texto.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (porId) return porId[1];

  // Para ResolveVanityURL me quedo con el nombre personalizado. Solo admito los
  // caracteres que Steam permite en uno, así nada raro llega a la petición.
  const porNombre = texto.match(/steamcommunity\.com\/id\/([A-Za-z0-9_-]+)/i);
  const nombre = porNombre ? porNombre[1] : texto;
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(nombre)) {
    throw new ErrorSteam(
      'No reconozco ese perfil de Steam. Prueba con la URL de tu perfil o con tu SteamID de 17 dígitos',
      400
    );
  }

  const res = await steamGet('ISteamUser/ResolveVanityURL/v1/', { vanityurl: nombre });
  exigirRespuestaValida(res);

  // success: 1 = encontrado, 42 = no existe ese nombre
  if (res.data?.response?.success !== 1) {
    throw new ErrorSteam('No existe ningún perfil de Steam con ese nombre', 404);
  }
  return res.data.response.steamid;
}

// Nombre, foto y URL del perfil. "publico" es true si el perfil es visible para
// cualquiera (communityvisibilitystate 3); sin eso Steam no da la biblioteca.
async function getPerfil(steamId) {
  const res = await steamGet('ISteamUser/GetPlayerSummaries/v2/', { steamids: steamId });
  exigirRespuestaValida(res);

  const jugador = res.data?.response?.players?.[0];
  if (!jugador) {
    throw new ErrorSteam('No existe ningún perfil de Steam con ese ID', 404);
  }

  return {
    steamId: jugador.steamid,
    nombre: jugador.personaname,
    avatar: jugador.avatarfull ?? null,
    urlPerfil: jugador.profileurl ?? null,
    publico: jugador.communityvisibilitystate === 3,
  };
}

// Todos los juegos de la cuenta con las horas jugadas:
// [{ appid, name, playtime_forever (minutos), playtime_2weeks? }, ...]
// include_played_free_games: incluye los gratuitos que se han jugado (Dota 2...).
async function getJuegosPoseidos(steamId) {
  const res = await steamGet('IPlayerService/GetOwnedGames/v1/', {
    steamid: steamId,
    include_appinfo: 1,
    include_played_free_games: 1,
  });
  exigirRespuestaValida(res);

  const respuesta = res.data?.response;
  // Con la biblioteca privada Steam responde 200 pero con un objeto vacío, sin
  // ni siquiera game_count. Una biblioteca pública vacía sí trae game_count: 0.
  if (!respuesta || respuesta.game_count === undefined) {
    throw new ErrorSteam(
      'Tu perfil de Steam es privado. En Steam, pon "Detalles del juego" en público y vuelve a sincronizar',
      422
    );
  }

  return respuesta.games ?? [];
}

// Logros de un juego: { desbloqueados, total }.
//  - total 0: el juego no tiene logros (Steam responde 400 "no stats")
//  - null: no he podido consultarlo (fallo puntual); quien llama no debe pisar
//    con esto lo que ya tenía guardado
async function getLogros(steamId, appid) {
  try {
    const res = await steamGet('ISteamUserStats/GetPlayerAchievements/v1/', { steamid: steamId, appid });

    if (res.status === 400) return { desbloqueados: 0, total: 0 };
    if (res.status !== 200 || !Array.isArray(res.data?.playerstats?.achievements)) {
      return res.data?.playerstats?.success === true ? { desbloqueados: 0, total: 0 } : null;
    }

    const logros = res.data.playerstats.achievements;
    return {
      desbloqueados: logros.filter((l) => l.achieved === 1).length,
      total: logros.length,
    };
  } catch {
    return null;
  }
}

module.exports = { ErrorSteam, resolverSteamId, getPerfil, getJuegosPoseidos, getLogros };
