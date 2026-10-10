const pool = require('../config/db');
const { sincronizarSteam } = require('../controllers/accountController');

// Sincronización automática de Steam: cada cierto tiempo el propio servidor trae
// las horas y los logros de las cuentas vinculadas, sin que nadie pulse el botón.
//  - STEAM_SYNC_MINUTOS (opcional, 60 por defecto): cada cuánto se sincroniza cada
//    cuenta. Con 0 se desactiva (queda el botón y la sincronización al abrir el perfil).
//    Ojo con bajarlo mucho: cada sincronización gasta una consulta a Steam por juego
//    jugado, y la clave de la app tiene un tope de 100.000 consultas al día.
// Corre dentro del mismo proceso del backend, igual que el candado "sincronizando" de
// accountController: vale mientras haya un único proceso.

const MINUTOS = Number(process.env.STEAM_SYNC_MINUTOS ?? 60);

// Cada cuánto miro si a alguien le toca. No hace falta que sea tan seguido como
// MINUTOS: miro más a menudo para que una cuenta recién vinculada no espere una hora.
const REVISION_MS = Math.min(5, MINUTOS) * 60 * 1000;

// Cuándo intenté sincronizar a cada usuario por última vez. last_sync_at solo se
// actualiza si sale bien; sin esto, un perfil privado (que siempre falla) se
// reintentaría en cada revisión.
const ultimoIntento = new Map(); // userId -> ms

let revisando = false;

// Sincroniza, de una en una, las cuentas que llevan más de MINUTOS sin hacerlo.
// De una en una para no saturar a Steam ni a IGDB.
async function sincronizarPendientes() {
  if (revisando) return;
  revisando = true;

  try {
    const pendientes = await pool.query(
      `SELECT user_id FROM linked_accounts
       WHERE platform = 'steam'
         AND (last_sync_at IS NULL OR last_sync_at < NOW() - $1::float * INTERVAL '1 minute')`,
      [MINUTOS]
    );

    for (const { user_id: userId } of pendientes.rows) {
      const ultimo = ultimoIntento.get(userId) ?? 0;
      if (Date.now() - ultimo < MINUTOS * 60 * 1000) continue;
      ultimoIntento.set(userId, Date.now());

      try {
        const { resumen } = await sincronizarSteam(userId);
        console.log(`Sincronización automática de Steam (usuario ${userId}): ${resumen.actualizados} actualizados, ${resumen.anadidos} añadidos`);
      } catch (err) {
        // 409 = ya la estaba sincronizando alguien (el botón): no es un fallo
        if (err.status !== 409) {
          console.warn(`Sincronización automática de Steam (usuario ${userId}) fallida:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Error en la sincronización automática de Steam:', err.message);
  } finally {
    revisando = false;
  }
}

function iniciarSincronizacionAutomatica() {
  if (!process.env.STEAM_API_KEY || !(MINUTOS > 0)) return;

  // unref(): que estos temporizadores no impidan cerrar el proceso
  setTimeout(sincronizarPendientes, 30 * 1000).unref();
  setInterval(sincronizarPendientes, REVISION_MS).unref();
  console.log(`Sincronización automática de Steam activa (cada ${MINUTOS} min)`);
}

module.exports = { iniciarSincronizacionAutomatica };
