import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import { IconoTema } from './BotonTema'
import { temaActual, alternarTema } from './tema'

// Menú del usuario en la barra: la foto de perfil y, debajo, un desplegable con
// "Ver perfil", el interruptor de tema claro/oscuro y "Cerrar sesión".
//  - perfil: nombre y foto del usuario (null mientras carga)
//  - setToken: para cerrar sesión (borrar el token hace que RutaProtegida me lleve al login)
//
// Se abre de tres formas, para que funcione con cualquier dispositivo:
//  - ratón: al pasar por encima (y se cierra al salir). Un clic en la foto lleva
//    directo al perfil.
//  - táctil: al tocar la foto (un móvil no tiene "pasar por encima"); desde el
//    desplegable se llega al perfil con "Ver perfil"
//  - teclado: Enter o Espacio sobre la foto, ya que es un botón
const DURACION_SALIDA_MS = 160 // debe coincidir con la animación de salida del CSS

function MenuUsuario({ perfil, setToken }) {
  // Tres fases, como en Desplegable.jsx: al cerrar no quito el panel de golpe,
  // paso por "cerrando" para que se vea la animación de salida y solo después
  // lo saco del DOM ("cerrado").
  const [fase, setFase] = useState('cerrado')
  const abierto = fase === 'abierto'
  const contenedorRef = useRef(null)
  const botonRef = useRef(null)
  // Con qué tipo de puntero se pulsó la foto por última vez (ver alPulsarFoto)
  const punteroRef = useRef("")
  const [tema, setTema] = useState(temaActual)
  const { pathname } = useLocation()
  const navigate = useNavigate()

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

  // pointerType distingue ratón, dedo y lápiz. Solo el ratón abre y cierra al
  // pasar por encima: en un móvil, tocar dispara también "pointerenter" y el
  // desplegable se abriría y cerraría de golpe con el mismo toque.
  function alEntrar(e) {
    if (e.pointerType === 'mouse') abrir()
  }

  function alSalir(e) {
    if (e.pointerType === 'mouse') cerrar()
  }

  // Esc cierra el desplegable y devuelve el foco a la foto
  function alPulsarTecla(e) {
    if (e.key === 'Escape' && abierto) {
      cerrar()
      botonRef.current.focus()
    }
  }

  // Si el foco (con Tab) sale del menú, lo cierro. relatedTarget es el elemento
  // que recibe el foco; si sigue dentro del menú, no hago nada.
  function alPerderFoco(e) {
    if (!contenedorRef.current.contains(e.relatedTarget)) cerrar()
  }

  // Ratón: el menú ya se abrió al pasar por encima, así que el clic en la foto
  // va directo al perfil. Dedo o teclado: alterna el menú (abrir/cerrar), porque
  // no hay otra forma de abrirlo.
  // El tipo de puntero lo leo en "pointerdown" (que siempre lo trae bien y llega
  // antes del clic). Un clic de teclado no tiene pointerdown: queda en "".
  function alPulsarFoto() {
    const puntero = punteroRef.current
    punteroRef.current = ""

    if (puntero === 'mouse') {
      cerrar()
      navigate('/perfil')
    } else if (abierto) {
      cerrar()
    } else {
      abrir()
    }
  }

  function cerrarSesion() {
    localStorage.removeItem("token")
    setToken("")
  }

  return (
    <div
      ref={contenedorRef}
      className="menu-usuario"
      onPointerEnter={alEntrar}
      onPointerLeave={alSalir}
      onKeyDown={alPulsarTecla}
      onBlur={alPerderFoco}
    >
      <button
        ref={botonRef}
        type="button"
        className={pathname === '/perfil' ? "menu-usuario__boton menu-usuario__boton--activo" : "menu-usuario__boton"}
        aria-label="Menú de usuario"
        aria-expanded={abierto}
        aria-controls="menu-usuario-panel"
        onPointerDown={(e) => { punteroRef.current = e.pointerType }}
        onClick={alPulsarFoto}
      >
        <Avatar usuario={perfil} tamano="pequeno" />
      </button>

      {fase !== 'cerrado' && (
        // El panel pega con el botón (sin hueco) y el espacio visual lo da su
        // padding. Además tiene un "puente" invisible (ver .menu-usuario__panel::before
        // en el CSS) para que el ratón no salga del menú al ir en diagonal.
        <div
          id="menu-usuario-panel"
          className={fase === 'cerrando' ? "menu-usuario__panel menu-usuario__panel--saliendo" : "menu-usuario__panel"}
        >
          <div className="menu-usuario__lista">
            {perfil && <p className="menu-usuario__nombre">{perfil.username}</p>}
            <Link to="/perfil" className="menu-usuario__opcion" onClick={cerrar}>
              Ver perfil
            </Link>
            {/* No cierra el menú: así se ve el cambio y se puede volver a pulsar */}
            <button type="button" className="menu-usuario__opcion" onClick={() => setTema(alternarTema())}>
              {tema === "oscuro" ? "Tema claro" : "Tema oscuro"}
              <IconoTema tema={tema} />
            </button>
            <button type="button" className="menu-usuario__opcion menu-usuario__opcion--salir" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuUsuario
