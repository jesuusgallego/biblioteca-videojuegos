// Pruebas de getLogrosDetallados con Steam simulado (no hace falta clave ni internet).
// Se ejecutan con: npm test
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const axios = require('axios');

process.env.STEAM_API_KEY = 'clave-falsa';

// Sustituyo axios.get por una función que devuelve lo que cada prueba prepara
let respuestas = {};
const llamadas = [];
axios.get = async (url, { params }) => {
  llamadas.push({ url, params });
  const clave = url.includes('GetPlayerAchievements') ? 'jugador' : 'esquema';
  const r = respuestas[clave];
  if (r instanceof Error) throw r;
  return r;
};

const { getLogrosDetallados, ErrorSteam } = require('../src/services/steamService');

const esquemaOk = { status: 200, data: { game: { availableGameStats: { achievements: [
  { name: 'A1', displayName: 'Uno', hidden: 0, description: 'Hazlo', icon: 'http://i/a1.jpg', icongray: 'http://i/a1g.jpg' },
  { name: 'A2', displayName: 'Dos', hidden: 1, icon: 'http://i/a2.jpg', icongray: 'http://i/a2g.jpg' },
  { name: 'A3', displayName: 'Tres', hidden: 0, description: 'Otro', icon: 'http://i/a3.jpg', icongray: 'http://i/a3g.jpg' },
] } } } };

const jugadorOk = { status: 200, data: { playerstats: { success: true, achievements: [
  { apiname: 'A1', achieved: 1, unlocktime: 1700000000, name: 'Uno', description: 'Hazlo' },
  { apiname: 'A2', achieved: 0, unlocktime: 0, name: 'Dos', description: '' },
  { apiname: 'A3', achieved: 1, unlocktime: 0, name: 'Tres', description: 'Otro' },
] } } };

// Comprueba que la promesa falla con un ErrorSteam de ese código (y, opcional, mensaje)
async function falla(status, fragmento, ...args) {
  await assert.rejects(
    () => getLogrosDetallados(...args),
    (e) => e instanceof ErrorSteam && e.status === status && (!fragmento || e.message.includes(fragmento))
  );
}

beforeEach(() => { llamadas.length = 0; });

test('caso normal: une jugador y esquema (icono en color o en gris, oculto, fecha)', async () => {
  respuestas = { jugador: jugadorOk, esquema: esquemaOk };
  const l = await getLogrosDetallados('7656', 10, 'es');

  assert.strictEqual(l.length, 3);
  assert.deepStrictEqual(l[0], { id: 'A1', nombre: 'Uno', descripcion: 'Hazlo', icono: 'http://i/a1.jpg', oculto: false, desbloqueado: true, fecha: 1700000000 });
  assert.deepStrictEqual(l[1], { id: 'A2', nombre: 'Dos', descripcion: '', icono: 'http://i/a2g.jpg', oculto: true, desbloqueado: false, fecha: null });
  assert.strictEqual(l[2].fecha, null, 'unlocktime 0 no es una fecha');
});

test('el idioma de la app se traduce al de Steam', async () => {
  respuestas = { jugador: jugadorOk, esquema: esquemaOk };
  await getLogrosDetallados('7656', 10, 'es');
  assert.ok(llamadas.every((c) => c.params.l === 'spanish'));

  llamadas.length = 0;
  await getLogrosDetallados('7656', 10, 'xx');
  assert.ok(llamadas.every((c) => c.params.l === 'english'), 'un idioma desconocido usa inglés');
});

test('un juego sin logros (400) devuelve una lista vacía', async () => {
  respuestas = { jugador: { status: 400, data: {} }, esquema: { status: 200, data: { game: {} } } };
  assert.deepStrictEqual(await getLogrosDetallados('7656', 10, 'es'), []);
});

test('perfil privado (403 con error) lanza 422', async () => {
  respuestas = { jugador: { status: 403, data: { playerstats: { error: 'Profile is not public', success: false } } }, esquema: esquemaOk };
  await falla(422, 'privado', '7656', 10, 'es');
});

test('clave inválida o Steam caído lanzan 502', async () => {
  respuestas = { jugador: { status: 403, data: '<html>Forbidden</html>' }, esquema: { status: 403, data: '' } };
  await falla(502, 'clave', '7656', 10, 'es');

  respuestas = { jugador: { status: 503, data: '' }, esquema: { status: 503, data: '' } };
  await falla(502, 'no responde', '7656', 10, 'es');
});

test('si el esquema falla, la lista sale igual pero sin iconos', async () => {
  respuestas = { jugador: jugadorOk, esquema: { status: 500, data: '' } };
  const l = await getLogrosDetallados('7656', 10, 'es');

  assert.strictEqual(l.length, 3);
  assert.ok(l.every((x) => x.icono === null && !x.oculto));
  assert.strictEqual(l[0].nombre, 'Uno');
});

test('una respuesta rara de Steam y un fallo de red lanzan 502', async () => {
  respuestas = { jugador: { status: 200, data: {} }, esquema: esquemaOk };
  await falla(502, 'No se pudieron', '7656', 10, 'es');

  respuestas = { jugador: new Error('ECONNRESET'), esquema: esquemaOk };
  await falla(502, 'No se pudo conectar', '7656', 10, 'es');
});
