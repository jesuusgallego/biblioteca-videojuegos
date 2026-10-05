// Tema claro/oscuro. El tema vive en el atributo data-tema de <html>, y el CSS
// (index.css) cambia todos los colores según ese atributo. La preferencia se
// guarda en localStorage; el script de index.html la aplica antes de pintar.
const CLAVE = 'tema'

export function temaActual() {
  return document.documentElement.dataset.tema === 'claro' ? 'claro' : 'oscuro'
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // Sin localStorage (modo privado, etc.) el tema vale solo para esta visita
  }
}
