import { useState, useEffect } from 'react'

// Para un elemento que aparece y desaparece según una condición (un mensaje de
// error, por ejemplo): si lo quito del DOM en cuanto la condición pasa a false,
// no hay forma de animar su salida. Este hook lo mantiene "montado" un rato más.
//  - visible: la condición
//  - duracion: lo que dura la animación de salida (debe coincidir con el CSS)
// Devuelve:
//  - montado: si hay que pintarlo (true también mientras sale)
//  - saliendo: true mientras se reproduce la salida; el componente le pone la
//    clase de salida
export function usePresencia(visible, duracion = 200) {
  const [montado, setMontado] = useState(visible)

  // Al pasar a visible lo monto en el mismo render (React permite cambiar el
  // estado propio mientras se pinta; así no hay un pintado intermedio sin él)
  if (visible && !montado) setMontado(true)

  // Al dejar de ser visible espero a que acabe la salida y entonces lo quito
  useEffect(() => {
    if (visible || !montado) return
    const t = setTimeout(() => setMontado(false), duracion)
    return () => clearTimeout(t)
  }, [visible, montado, duracion])

  return { montado, saliendo: montado && !visible }
}
