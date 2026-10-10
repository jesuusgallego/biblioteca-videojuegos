// Idioma de la interfaz. Misma idea que tema.js: la preferencia se guarda en
// localStorage y el idioma vive en el atributo lang de <html> (lo leen los
// lectores de pantalla y los navegadores para, por ejemplo, la ortografía).
//
// Los textos están en textos/es.js y textos/en.js, con las mismas claves en los
// dos. Para escribir uno en pantalla se usa t('clave'), que devuelve el texto en
// el idioma actual. Dentro de un componente se obtiene con el hook useIdioma()
// (ver IdiomaContext.js); fuera de React (api.js), con traducir() de aquí.
import es from './textos/es'
import en, { erroresApi } from './textos/en'

const CLAVE = 'idioma'
const TEXTOS = { es, en }

// "nombre" se escribe siempre en su propio idioma, para que quien no entienda el
// actual pueda encontrar el suyo. "locale" es el que usa Intl para dar formato a
// las fechas.
export const IDIOMAS = [
  { codigo: 'es', nombre: 'Español', locale: 'es-ES' },
  { codigo: 'en', nombre: 'English', locale: 'en-GB' },
]

const IDIOMA_POR_DEFECTO = 'es'

function leerGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado in TEXTOS) return guardado
  } catch {
    // Sin localStorage (modo privado, etc.) uso el idioma por defecto
  }
  return IDIOMA_POR_DEFECTO
}

// Idioma activo. Es una variable del módulo (no solo estado de React) para que
// también lo lea código que no es un componente, como apiFetch.
let actual = leerGuardado()
document.documentElement.lang = actual

export function idiomaActual() {
  return actual
}

export function aplicarIdioma(codigo) {
  if (!(codigo in TEXTOS)) return
  actual = codigo
  document.documentElement.lang = codigo
  try {
    localStorage.setItem(CLAVE, codigo)
  } catch {
    // El idioma solo vale para esta visita
  }
}

// El texto de `clave` en `idioma`, con los {huecos} sustituidos por `params`:
//   traducir('es', 'perfil.miembroDesde', { fecha: 'mayo de 2026' })
// Si falta en ese idioma uso el español, y si tampoco está, la propia clave (así
// un olvido se nota en pantalla en vez de dejar un hueco en blanco).
export function traducir(idioma, clave, params) {
  const texto = TEXTOS[idioma]?.[clave] ?? TEXTOS[IDIOMA_POR_DEFECTO][clave] ?? clave
  if (!params) return texto
  return texto.replace(/\{(\w+)\}/g, (hueco, nombre) => params[nombre] ?? hueco)
}

// Los errores que manda el backend vienen en español. Si la interfaz está en otro
// idioma busco la frase en la tabla de textos/en.js; si no está, la dejo tal cual.
export function traducirErrorApi(mensaje) {
  if (actual === IDIOMA_POR_DEFECTO) return mensaje
  return erroresApi[mensaje] ?? mensaje
}

export function localeDe(idioma) {
  return IDIOMAS.find((i) => i.codigo === idioma)?.locale ?? 'es-ES'
}
