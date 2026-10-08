import { useState, useRef, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import Cargando from './Cargando'

// Desplegable propio en lugar del <select> nativo: la lista de un <select> la
// dibuja el navegador a su manera y no se puede animar ni ajustar a los colores
// del tema. Con este se ve y se anima igual en todos los navegadores.
//
// Sigue el patrón accesible "select-only combobox": el foco se queda siempre en
// el botón y la opción resaltada se indica con aria-activedescendant.
//  - opciones: [{ valor, etiqueta }, ...]
//  - valor: el "valor" de la opción elegida
//  - onChange(nuevoValor)
//  - cargando: cambia la flecha por el indicador de carga (la lista aún no está)

const DURACION_SALIDA_MS = 160 // debe coincidir con la animación de salida del CSS
const ALTO_MAX = 240 // px
const SEPARACION = 4 // px entre el botón y la lista

// Calculo dónde colocar la lista según el botón. La pinto fuera de su sitio con
// position: fixed porque las tarjetas tienen overflow: hidden y la recortarían.
// Si abajo no hay sitio y arriba sí, la abro hacia arriba.
function medir(boton) {
  const r = boton.getBoundingClientRect()
  const abajo = window.innerHeight - r.bottom - 8
  const arriba = r.top - 8
  const haciaArriba = abajo < 180 && arriba > abajo

  return {
    haciaArriba,
    left: r.left,
    width: r.width,
    maxHeight: Math.min(ALTO_MAX, (haciaArriba ? arriba : abajo) - SEPARACION),
    ...(haciaArriba
      ? { bottom: window.innerHeight - r.top + SEPARACION }
      : { top: r.bottom + SEPARACION }),
  }
}

function Desplegable({ opciones, valor, onChange, disabled = false, cargando = false }) {
  const idLista = useId()
  const botonRef = useRef(null)
  const listaRef = useRef(null)

  // La lista debe seguir en pantalla mientras suena la animación de salida, por
  // eso hay tres fases y no solo abierto/cerrado.
  const [fase, setFase] = useState('cerrado') // 'cerrado' | 'abierto' | 'cerrando'
  const [activo, setActivo] = useState(0) // índice de la opción resaltada
  const [posicion, setPosicion] = useState(null)
  // Dónde cuelga la lista: dentro del <dialog> si el botón está en una ventana modal
  // (detrás de ella, en <body>, no se vería ni se podría pulsar); si no, en <body>
  const [contenedor, setContenedor] = useState(null)

  const abierto = fase === 'abierto'
  const visible = fase !== 'cerrado'
  const indiceElegido = opciones.findIndex((o) => o.valor === valor)
  const elegida = opciones[indiceElegido]

  function abrir(indiceInicial = indiceElegido) {
    if (disabled) return
    setPosicion(medir(botonRef.current))
    setContenedor(botonRef.current.closest('dialog') ?? document.body)
    setActivo(Math.max(0, indiceInicial))
    setFase('abierto')
  }

  function elegir(indice) {
    onChange(opciones[indice].valor)
    setFase('cerrando')
    botonRef.current.focus()
  }

  // Cuando termina la salida quito la lista del DOM
  useEffect(() => {
    if (fase !== 'cerrando') return
    const t = setTimeout(() => setFase('cerrado'), DURACION_SALIDA_MS)
    return () => clearTimeout(t)
  }, [fase])

  // Con la lista abierta: un clic fuera la cierra y, si la página se desplaza o
  // cambia de tamaño, la lista sigue pegada al botón.
  useEffect(() => {
    if (!abierto) return

    function clicFuera(e) {
      // Pulsar el texto de la <label> que envuelve al botón cuenta como pulsar el
      // botón (el navegador reenvía el clic), así que aquí no hay que cerrar
      const etiqueta = botonRef.current.closest('label')
      if (botonRef.current.contains(e.target)) return
      if (listaRef.current?.contains(e.target)) return
      if (etiqueta?.contains(e.target)) return
      setFase('cerrando')
    }
    function recolocar(e) {
      if (listaRef.current?.contains(e.target)) return // scroll de la propia lista
      setPosicion(medir(botonRef.current))
    }

    window.addEventListener('mousedown', clicFuera)
    window.addEventListener('scroll', recolocar, true)
    window.addEventListener('resize', recolocar)
    return () => {
      window.removeEventListener('mousedown', clicFuera)
      window.removeEventListener('scroll', recolocar, true)
      window.removeEventListener('resize', recolocar)
    }
  }, [abierto])

  // Mantengo a la vista la opción resaltada cuando la lista tiene scroll
  useEffect(() => {
    if (!abierto) return
    document.getElementById(`${idLista}-${activo}`)?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo, idLista])

  function alPulsarTecla(e) {
    const ultima = opciones.length - 1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (abierto) setActivo(Math.min(activo + 1, ultima))
        else abrir()
        break
      case 'ArrowUp':
        e.preventDefault()
        if (abierto) setActivo(Math.max(activo - 1, 0))
        else abrir()
        break
      case 'Home':
        if (abierto) { e.preventDefault(); setActivo(0) }
        break
      case 'End':
        if (abierto) { e.preventDefault(); setActivo(ultima) }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (abierto) elegir(activo)
        else abrir()
        break
      case 'Escape':
        if (abierto) {
          // No dejo que Esc llegue también a una ventana que haya detrás
          e.preventDefault()
          e.stopPropagation()
          setFase('cerrando')
        }
        break
      case 'Tab':
        if (abierto) setFase('cerrando')
        break
      default:
        // Si escribe una letra, salto a la siguiente opción que empiece por ella
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const letra = e.key.toLowerCase()
          const desde = abierto ? activo : indiceElegido
          const orden = opciones.map((_, i) => (desde + 1 + i) % opciones.length)
          const encontrada = orden.find((i) => opciones[i].etiqueta.toLowerCase().startsWith(letra))
          if (encontrada !== undefined) {
            if (abierto) setActivo(encontrada)
            else abrir(encontrada)
          }
        }
    }
  }

  // Con teclado, Enter y Espacio ya los gestiona alPulsarTecla, pero el navegador
  // lanza además un clic "falso" (detail === 0) que tengo que ignorar.
  function alPulsarBoton(e) {
    if (e.detail === 0) return
    if (abierto) setFase('cerrando')
    else abrir()
  }

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className="desplegable__boton"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={abierto ? `${idLista}-${activo}` : undefined}
        disabled={disabled}
        onClick={alPulsarBoton}
        onKeyDown={alPulsarTecla}
      >
        <span>{elegida?.etiqueta ?? ""}</span>
        {cargando ? (
          <Cargando tamano="pequeno" />
        ) : (
          <svg className="desplegable__flecha" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      {visible && createPortal(
        <ul
          ref={listaRef}
          id={idLista}
          role="listbox"
          className={[
            'desplegable__lista',
            posicion.haciaArriba && 'desplegable__lista--arriba',
            fase === 'cerrando' && 'desplegable__lista--saliendo',
          ].filter(Boolean).join(' ')}
          style={{
            top: posicion.top,
            bottom: posicion.bottom,
            left: posicion.left,
            width: posicion.width,
            maxHeight: posicion.maxHeight,
          }}
        >
          {opciones.map((o, i) => (
            <li
              key={o.valor}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={o.valor === valor}
              className={`desplegable__opcion${i === activo ? ' desplegable__opcion--activa' : ''}`}
              onMouseEnter={() => setActivo(i)}
              onMouseDown={(e) => e.preventDefault()} // el foco no se va del botón
              onClick={() => elegir(i)}
            >
              {o.etiqueta}
            </li>
          ))}
        </ul>,
        contenedor,
      )}
    </>
  )
}

export default Desplegable
