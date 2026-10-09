import { useState, useRef, useEffect } from 'react'

// Lo que dura la animación de salida de las ventanas (debe coincidir con
// "detalle-salida" en App.css)
const DURACION_SALIDA_MS = 200

// Cierre animado para las ventanas <dialog> (ficha, edición, confirmación).
// Las ventanas entran con animación, así que también tienen que salir con ella.
// El problema es que el padre las quita del DOM nada más recibir onCerrar(), y
// el <dialog> nativo se cierra al instante con Esc. Este hook lo arregla:
//  - cerrar(): pone la clase de salida (ver "saliendo"), espera a que acabe la
//    animación y solo entonces llama a onCerrar(). Con cerrar(otraFuncion) llama
//    a esa en lugar de onCerrar (por ejemplo "Confirmar" en DialogoConfirmar).
//    Si ya se está cerrando, no hace nada: un doble clic no la cierra dos veces.
//  - alCancelar: para el onCancel del <dialog>. "cancel" es el evento que lanza
//    el navegador con Esc justo antes de cerrar; con preventDefault() evito que
//    se cierre solo y lo hago yo con animación.
//  - saliendo: true mientras sale; el componente le añade la clase
//    "ventana--saliendo" al <dialog>.
export function useVentana(onCerrar) {
  const [saliendo, setSaliendo] = useState(false)
  const saliendoRef = useRef(false)
  const temporizadorRef = useRef(null)

  function cerrar(despues = onCerrar) {
    if (saliendoRef.current) return
    saliendoRef.current = true
    setSaliendo(true)

    // Con "reducir movimiento" el CSS quita las animaciones: no hay nada que esperar
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    temporizadorRef.current = setTimeout(despues, sinMovimiento ? 0 : DURACION_SALIDA_MS)
  }

  function alCancelar(e) {
    e.preventDefault()
    cerrar()
  }

  // Si el componente se quita mientras sale, cancelo el aviso pendiente
  useEffect(() => () => clearTimeout(temporizadorRef.current), [])

  return { saliendo, cerrar, alCancelar }
}
