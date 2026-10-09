import { useState, useEffect, useRef } from 'react'

const DURACION_SALIDA_MS = 160 // debe coincidir con la animación de salida del CSS

// Comportamiento común de los menús desplegables de la barra (el de la foto de
// perfil, MenuUsuario, y el de ajustes, MenuAjustes): abrir y cerrar con
// animación, cerrar con un clic fuera, con Esc o al sacar el foco, y abrirse al
// pasar el ratón por encima.
//
// Tres fases, como en Desplegable.jsx: al cerrar no quito el panel de golpe,
// paso por "cerrando" para que se vea la animación de salida y solo después lo
// saco del DOM ("cerrado").
//
// Devuelve:
//  - fase / abierto: cómo está el panel ahora
//  - abrir() / cerrar()
//  - contenedorRef: para el <div> que envuelve el botón y el panel
//  - botonRef: para el botón que abre el menú (recibe el foco al pulsar Esc)
//  - propsContenedor: eventos que hay que repartir sobre ese <div>
export function useMenuDesplegable() {
  const [fase, setFase] = useState('cerrado')
  const abierto = fase === 'abierto'
  const contenedorRef = useRef(null)
  const botonRef = useRef(null)

  function abrir() {
    setFase('abierto')
  }

  // Solo se cierra lo que está abierto: si ya está cerrando o cerrado, no hago nada
  function cerrar() {
    setFase((f) => (f === 'abierto' ? 'cerrando' : f))
  }

  // Cuando termina la animación de salida quito el panel del DOM
  useEffect(() => {
    if (fase !== 'cerrando') return
    const t = setTimeout(() => setFase('cerrado'), DURACION_SALIDA_MS)
    return () => clearTimeout(t)
  }, [fase])

  // Mientras está abierto: un clic fuera lo cierra
  useEffect(() => {
    if (!abierto) return

    function cerrarSiEsFuera(e) {
      if (!contenedorRef.current.contains(e.target)) cerrar()
    }

    document.addEventListener('pointerdown', cerrarSiEsFuera)
    return () => document.removeEventListener('pointerdown', cerrarSiEsFuera)
  }, [abierto])

  const propsContenedor = {
    // pointerType distingue ratón, dedo y lápiz. Solo el ratón abre y cierra al
    // pasar por encima: en un móvil, tocar dispara también "pointerenter" y el
    // desplegable se abriría y cerraría de golpe con el mismo toque.
    onPointerEnter: (e) => {
      if (e.pointerType === 'mouse') abrir()
    },
    onPointerLeave: (e) => {
      if (e.pointerType === 'mouse') cerrar()
    },
    // Esc cierra el desplegable y devuelve el foco al botón
    onKeyDown: (e) => {
      if (e.key === 'Escape' && abierto) {
        cerrar()
        botonRef.current.focus()
      }
    },
    // Si el foco (con Tab) sale del menú, lo cierro. relatedTarget es el elemento
    // que recibe el foco; si sigue dentro del menú, no hago nada.
    onBlur: (e) => {
      if (!contenedorRef.current.contains(e.relatedTarget)) cerrar()
    },
  }

  return { fase, abierto, abrir, cerrar, contenedorRef, botonRef, propsContenedor }
}
