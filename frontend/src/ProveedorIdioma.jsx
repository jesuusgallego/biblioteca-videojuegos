import { useState, useMemo } from 'react'
import { IdiomaContext } from './IdiomaContext'
import { idiomaActual, aplicarIdioma, traducir, localeDe } from './idioma'

// Envuelve toda la app (ver main.jsx). Guarda el idioma en un estado: al
// cambiarlo, React vuelve a pintar a todos los que lo usan con useIdioma().
function ProveedorIdioma({ children }) {
  const [idioma, setIdiomaEstado] = useState(idiomaActual)

  // useMemo evita crear un objeto nuevo en cada pintado (que haría repintarse a
  // todos los consumidores aunque el idioma no haya cambiado)
  const valor = useMemo(() => ({
    idioma,
    locale: localeDe(idioma),
    t: (clave, params) => traducir(idioma, clave, params),
    setIdioma: (codigo) => {
      aplicarIdioma(codigo)
      setIdiomaEstado(codigo)
    },
  }), [idioma])

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}

export default ProveedorIdioma
