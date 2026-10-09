import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useVentana } from './useVentana'

// Distancia mínima al borde de la ventana del navegador
const MARGEN = 8

// Menú que sale al hacer clic derecho (o con la tecla de menú contextual) sobre una
// tarjeta. Se pinta en <body> con position: fixed, porque las tarjetas tienen
// overflow: hidden y se mueven al pasar el ratón (un transform cambia la referencia
// de un fixed). Sale y entra con animación, como el resto de la app.
//  - x, y: dónde se abre (coordenadas de la ventana, las del clic)
//  - opciones: [{ id, etiqueta, icono?, peligro?, onElegir }]
//  - etiqueta: nombre accesible del menú
//  - onCerrar(): quien lo abre lo quita; se llama al acabar la animación de salida
// Teclado: flechas, Inicio y Fin para moverse, Enter para elegir, Esc o Tab para
// cerrar (devuelve el foco a donde estaba). Se cierra también al pulsar fuera, al
// hacer scroll, al cambiar el tamaño de la ventana o al perder el foco.
// Quien lo use debe darle un `key` distinto en cada apertura: así un segundo clic
// derecho crea un menú nuevo en lugar de reutilizar uno que ya se está cerrando.
function MenuContextual({ x, y, opciones, etiqueta, onCerrar }) {
  const menuRef = useRef(null)
  const volverARef = useRef(null)
  // Cierre con animación de salida (ver useVentana.js)
  const { saliendo, cerrar } = useVentana(onCerrar)

  // Lo coloco en el punto del clic, pero sin que se salga de la pantalla (se mide
  // ya pintado y se corrige antes de que el navegador lo enseñe)
  useLayoutEffect(() => {
    const menu = menuRef.current
    const izquierda = Math.min(x, window.innerWidth - menu.offsetWidth - MARGEN)
    const arriba = Math.min(y, window.innerHeight - menu.offsetHeight - MARGEN)
    menu.style.left = `${Math.max(MARGEN, izquierda)}px`
    menu.style.top = `${Math.max(MARGEN, arriba)}px`
  }, [x, y])

  // Al abrirse, el foco pasa a la primera opción; me guardo dónde estaba para
  // devolvérselo al cerrar con Esc
  useEffect(() => {
    volverARef.current = document.activeElement
    menuRef.current.querySelector('[role="menuitem"]')?.focus()
  }, [])

  useEffect(() => {
    function cerrarSiEsFuera(e) {
      if (!menuRef.current.contains(e.target)) cerrar()
    }

    document.addEventListener('pointerdown', cerrarSiEsFuera, true)
    window.addEventListener('scroll', cerrar, true)
    window.addEventListener('resize', cerrar)
    window.addEventListener('blur', cerrar)
    return () => {
      document.removeEventListener('pointerdown', cerrarSiEsFuera, true)
      window.removeEventListener('scroll', cerrar, true)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('blur', cerrar)
    }
  }, [cerrar])

  function alPulsarTecla(e) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const actual = items.indexOf(document.activeElement)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        items[(actual + 1) % items.length].focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        items[(actual - 1 + items.length) % items.length].focus()
        break
      case 'Home':
        e.preventDefault()
        items[0].focus()
        break
      case 'End':
        e.preventDefault()
        items[items.length - 1].focus()
        break
      case 'Escape':
      case 'Tab':
        // No dejo que Esc llegue también a una ventana que haya detrás
        e.preventDefault()
        e.stopPropagation()
        cerrar()
        volverARef.current?.focus?.()
        break
    }
  }

  function elegir(opcion) {
    // La acción empieza ya (abre su ventana) y el menú se desvanece mientras tanto
    cerrar()
    opcion.onElegir()
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={etiqueta}
      className={saliendo ? "menu-contextual menu-contextual--saliendo" : "menu-contextual"}
      style={{ left: x, top: y }}
      onKeyDown={alPulsarTecla}
      // Un clic derecho encima del propio menú no abre el del navegador
      onContextMenu={(e) => e.preventDefault()}
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          role="menuitem"
          className={opcion.peligro
            ? "menu-usuario__opcion menu-contextual__opcion menu-contextual__opcion--peligro"
            : "menu-usuario__opcion menu-contextual__opcion"}
          onClick={() => elegir(opcion)}
        >
          {opcion.icono}
          {opcion.etiqueta}
        </button>
      ))}
    </div>,
    document.body,
  )
}

export default MenuContextual
