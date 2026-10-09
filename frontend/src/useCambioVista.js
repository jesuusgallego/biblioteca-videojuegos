import { useState, useRef, useEffect } from 'react'

// Lo que dura la animación de salida de una vista (debe coincidir con
// "vista-salida" en estilos/perfil.css)
const DURACION_VISTA_MS = 160

// Cambio animado entre dos vistas de un mismo panel (por ejemplo, de la lista de
// ilustraciones al recortador): la que está se desvanece y, cuando acaba, se hace
// el cambio y entra la nueva. Quien lo use pinta la vista dentro de un elemento
// con la clase "vista" y le añade "vista--saliendo" mientras `saliendo` sea true.
//  - cambiar(accion): empieza la salida y, al terminar, ejecuta `accion`, que es
//    la que cambia de verdad de vista. Si ya hay un cambio en marcha, no hace nada.
export function useCambioVista() {
  const [saliendo, setSaliendo] = useState(false)
  const temporizadorRef = useRef(null)

  // Si me quitan mientras hay un cambio a medias, lo cancelo
  useEffect(() => () => clearTimeout(temporizadorRef.current), [])

  function cambiar(accion) {
    if (saliendo) return
    setSaliendo(true)

    // Con "reducir movimiento" el CSS quita las animaciones: no hay nada que esperar
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    temporizadorRef.current = setTimeout(() => {
      accion()
      setSaliendo(false)
    }, sinMovimiento ? 0 : DURACION_VISTA_MS)
  }

  return { saliendo, cambiar }
}
