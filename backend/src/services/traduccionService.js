const crypto = require('crypto');
const axios = require('axios');
const pool = require('../config/db');

// ---- Dos traductores ---------------------------------------------------------
// 1. Azure AI Translator (si hay clave en AZURE_TRANSLATOR_KEY): la mejor calidad.
//    Su plan gratuito (F0) da 2 millones de caracteres al mes.
// 2. LibreTranslate (el contenedor "traductor"): sin cuenta ni límites, de reserva
//    cuando no hay clave de Azure o hemos llegado al tope mensual.
const CLAVE_AZURE = process.env.AZURE_TRANSLATOR_KEY;
// Un recurso de Azure vive en una región (westeurope...) y hay que decirla en cada
// petición. Si el recurso es "Global", se deja sin definir.
const REGION_AZURE = process.env.AZURE_TRANSLATOR_REGION;
const URL_AZURE = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

// Tope propio de caracteres al mes enviados a Azure. Está algo por debajo de los 2
// millones del plan gratuito (queda un 5 % de margen) para no llegar al límite de
// Microsoft.
const LIMITE_MENSUAL_AZURE = Number(process.env.AZURE_TRANSLATOR_LIMITE_MENSUAL) || 1900000;

// En Docker Compose se sobrescribe con el nombre del servicio ("traductor"); en
// desarrollo, el contenedor publica el puerto 5000.
const URL_LIBRETRANSLATE = process.env.TRANSLATE_URL || 'http://localhost:5000';

// Idiomas que acepta la app y el idioma en que IGDB da los textos
const IDIOMAS = ['en', 'es'];
const IDIOMA_ORIGINAL = 'en';

// La primera traducción con LibreTranslate puede tardar (carga el modelo al arrancar)
const TIMEOUT_MS = 30000;

// Si Azure rechaza la clave (401/403) dejo de pedirle una hora; si dice que voy
// demasiado rápido (429), un minuto. Así no fallo en cada petición mientras tanto.
let azurePausadoHasta = 0;

function azureDisponible() {
  return Boolean(CLAVE_AZURE) && Date.now() >= azurePausadoHasta;
}

// Si dos personas piden a la vez la misma traducción, solo se hace una: guardo la
// promesa en curso y las demás peticiones esperan a la misma
const enCurso = new Map(); // "hash:idioma" -> Promise

// Traduce `texto` (en inglés) al idioma `destino`. Devuelve el texto traducido, o
// null si no se ha podido (los dos traductores fallan), para que quien lo llame
// enseñe el original en vez de fallar.
async function traducir(texto, destino) {
  if (destino === IDIOMA_ORIGINAL) return texto;

  const hash = crypto.createHash('sha256').update(texto).digest('hex');
  const clave = `${hash}:${destino}`;

  if (enCurso.has(clave)) return enCurso.get(clave);

  const promesa = traducirYGuardar(texto, hash, destino).finally(() => enCurso.delete(clave));
  enCurso.set(clave, promesa);
  return promesa;
}

// ---- Tope mensual ------------------------------------------------------------
const mesActual = () => new Date().toISOString().slice(0, 7); // "2026-10" (UTC)

// Reserva `n` caracteres del presupuesto de este mes ANTES de llamar a Azure.
// Devuelve false si con ellos nos pasaríamos del tope. Se hace en una sola
// sentencia SQL: ON CONFLICT ... DO UPDATE ... WHERE suma solo si no se pasa, y
// RETURNING devuelve la fila solo si hubo suma. Así dos peticiones a la vez no
// pueden reservar el mismo hueco.
async function reservarCaracteres(mes, n) {
  if (n > LIMITE_MENSUAL_AZURE) return false;

  const resultado = await pool.query(
    `INSERT INTO translation_usage (provider, month, characters)
     VALUES ('azure', $1, $2)
     ON CONFLICT (provider, month)
     DO UPDATE SET characters = translation_usage.characters + EXCLUDED.characters
     WHERE translation_usage.characters + EXCLUDED.characters <= $3
     RETURNING characters`,
    [mes, n, LIMITE_MENSUAL_AZURE]
  );

  if (resultado.rows.length === 0) return false;

  console.log(`Azure Translator: ${resultado.rows[0].characters} de ${LIMITE_MENSUAL_AZURE} caracteres usados en ${mes}`);
  return true;
}

// Si la llamada falla, Azure no ha traducido nada: devuelvo lo reservado
async function liberarCaracteres(mes, n) {
  await pool.query(
    `UPDATE translation_usage SET characters = GREATEST(characters - $2, 0)
     WHERE provider = 'azure' AND month = $1`,
    [mes, n]
  ).catch(() => {}); // si ni esto funciona, peor para el contador: mejor pasarse por exceso
}

// ---- Los dos traductores ------------------------------------------------------
// Devuelve el texto traducido, o null si no queda presupuesto este mes. Lanza el
// error de Azure si la llamada falla.
async function traducirConAzure(texto, destino) {
  const mes = mesActual();
  const n = texto.length;

  if (!(await reservarCaracteres(mes, n))) {
    console.warn(`Azure Translator: tope mensual de ${LIMITE_MENSUAL_AZURE} caracteres alcanzado; uso LibreTranslate hasta el mes que viene`);
    return null;
  }

  try {
    const respuesta = await axios.post(
      `${URL_AZURE}/translate`,
      [{ Text: texto }],
      {
        timeout: TIMEOUT_MS,
        params: { 'api-version': '3.0', from: IDIOMA_ORIGINAL, to: destino, textType: 'plain' },
        headers: {
          'Ocp-Apim-Subscription-Key': CLAVE_AZURE,
          ...(REGION_AZURE && { 'Ocp-Apim-Subscription-Region': REGION_AZURE }),
          'Content-Type': 'application/json',
        },
      }
    );
    return respuesta.data[0].translations[0].text;
  } catch (err) {
    await liberarCaracteres(mes, n);
    throw err;
  }
}

async function traducirConLibreTranslate(texto, destino) {
  const respuesta = await axios.post(
    `${URL_LIBRETRANSLATE}/translate`,
    { q: texto, source: IDIOMA_ORIGINAL, target: destino, format: 'text' },
    { timeout: TIMEOUT_MS }
  );
  return respuesta.data.translatedText;
}

async function traducirYGuardar(texto, hash, destino) {
  try {
    const guardada = await pool.query(
      'SELECT translated_text, provider FROM translations WHERE text_hash = $1 AND target = $2',
      [hash, destino]
    );
    const previa = guardada.rows[0];

    // Una traducción de Azure ya es la mejor posible. Una de LibreTranslate también
    // vale, salvo que ahora pueda hacerla Azure: entonces se rehace una vez.
    if (previa && (previa.provider === 'azure' || !azureDisponible())) {
      return previa.translated_text;
    }

    let traducido = null;
    let proveedor = null;

    if (azureDisponible()) {
      try {
        traducido = await traducirConAzure(texto, destino);
        if (traducido) proveedor = 'azure';
      } catch (err) {
        const estado = err.response?.status;
        if (estado === 401 || estado === 403) {
          azurePausadoHasta = Date.now() + 60 * 60 * 1000;
          console.error(`Azure Translator rechaza la clave o la cuota (${estado}); uso LibreTranslate durante una hora`);
        } else if (estado === 429) {
          azurePausadoHasta = Date.now() + 60 * 1000;
          console.error('Azure Translator: demasiadas peticiones (429); uso LibreTranslate un minuto');
        } else {
          console.error('Error con Azure Translator, uso LibreTranslate:', err.response?.data || err.message);
        }
      }
    }

    // Reserva: la traducción anterior si la hay; si no, LibreTranslate
    if (!traducido && previa) return previa.translated_text;
    if (!traducido) {
      traducido = await traducirConLibreTranslate(texto, destino);
      proveedor = 'libretranslate';
    }

    // ON CONFLICT DO UPDATE: sustituye la de LibreTranslate por la de Azure, y si
    // dos peticiones llegaran a la vez, la segunda no falla
    await pool.query(
      `INSERT INTO translations (text_hash, target, translated_text, provider)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (text_hash, target)
       DO UPDATE SET translated_text = EXCLUDED.translated_text, provider = EXCLUDED.provider`,
      [hash, destino, traducido, proveedor]
    );

    return traducido;
  } catch (err) {
    // No guardo nada: la próxima vez se vuelve a intentar
    console.error('Error al traducir:', err.response?.data || err.message);
    return null;
  }
}

module.exports = { traducir, IDIOMAS, IDIOMA_ORIGINAL };
