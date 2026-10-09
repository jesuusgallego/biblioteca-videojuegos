import { createContext, useContext } from 'react'

// El contexto de React es un "canal" por el que el idioma llega a cualquier
// componente sin pasarlo por props. El valor lo pone ProveedorIdioma.jsx.
export const IdiomaContext = createContext(null)

// Uso:  const { t, idioma, setIdioma, locale } = useIdioma()
//  - t('clave', { huecos }): el texto en el idioma actual
//  - idioma: 'es' o 'en'
//  - setIdioma('en'): cambia el idioma y todos los componentes que usen este
//    hook se vuelven a pintar
//  - locale: 'es-ES' / 'en-GB', para dar formato a fechas
export function useIdioma() {
  return useContext(IdiomaContext)
}
