import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Marca from './Marca'
import BotonTema from './BotonTema'
import Avatar from './Avatar'

// Coloco la línea bajo el enlace activo: mido dónde está y cuánto ocupa (en
// píxeles, respecto a la barra de navegación) y se lo aplico a la línea.
// Con conAnimacion = false la línea salta de golpe (primer pintado, cambios de
// tamaño de ventana); con true se desliza gracias al "transition" del CSS.
function colocarLinea(nav, linea, conAnimacion) {
  const activo = nav.querySelector('a.active')

  if (!activo) {
    linea.style.width = '0px'
    return
  }

  if (!conAnimacion) linea.style.transition = 'none'

  linea.style.width = `${activo.offsetWidth}px`
  linea.style.transform = `translateX(${activo.offsetLeft}px)`

  if (!conAnimacion) {
    // Fuerzo al navegador a aplicar el cambio YA, antes de reactivar la
    // transición; si no, la juntaría con el cambio y se animaría igualmente
    linea.getBoundingClientRect()
    linea.style.transition = ''
  }
}

// Barra superior. NavLink añade la clase "active" al enlace de la página actual.
// Cerrar sesión borra el token; RutaProtegida ve que ya no hay y redirige al
// login.
function Menu({ setToken, perfil }) {
  const navRef = useRef(null)
  const lineaRef = useRef(null)
  // useLocation hace que este componente se vuelva a pintar cada vez que cambia la ruta
  const { pathname } = useLocation()

  // Al cambiar de página la línea se desliza hasta el enlace nuevo. La primera
  // vez (aún sin anchura) la coloco sin animación para que no "crezca" desde el
  // borde al cargar la web.
  useEffect(() => {
    const linea = lineaRef.current
    colocarLinea(navRef.current, linea, linea.style.width !== '')
  }, [pathname])

  // Si un enlace cambia de tamaño (redimensiono la ventana, termina de cargar la
  // tipografía...) recoloco la línea al instante.
  useEffect(() => {
    const nav = navRef.current
    const linea = lineaRef.current
    const observador = new ResizeObserver(() => colocarLinea(nav, linea, false))
    nav.querySelectorAll('a').forEach((enlace) => observador.observe(enlace))
    return () => observador.disconnect()
  }, [])

  function cerrarSesion() {
    localStorage.removeItem("token")
    setToken("")
  }

  return (
    <header className="barra">
      <div className="barra__interior">
        <Marca to="/biblioteca" />

        <nav className="barra__nav" ref={navRef}>
          <NavLink to="/biblioteca">Mi biblioteca</NavLink>
          <NavLink to="/buscar">Buscar</NavLink>
          <span className="barra__linea" ref={lineaRef} aria-hidden="true" />
        </nav>

        <div className="barra__acciones">
          {/* Fuera de <nav> a propósito: la línea deslizante solo sigue a los enlaces de dentro */}
          <NavLink to="/perfil" className="barra__perfil" aria-label="Mi perfil">
            <Avatar usuario={perfil} tamano="pequeno" />
          </NavLink>
          <BotonTema />
          <button type="button" className="btn btn--secundario" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}

export default Menu
