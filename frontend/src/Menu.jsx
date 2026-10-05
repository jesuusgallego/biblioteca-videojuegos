import { NavLink } from 'react-router-dom'
import Marca from './Marca'
import BotonTema from './BotonTema'

// Barra superior. NavLink añade la clase "active" al enlace de la página en la
// que estás. Cerrar sesión borra el token; RutaProtegida ve que ya no hay y
// redirige al login.
function Menu({ setToken }) {
  function cerrarSesion() {
    localStorage.removeItem("token")
    setToken("")
  }

  return (
    <header className="barra">
      <div className="barra__interior">
        <Marca />

        <nav className="barra__nav">
          <NavLink to="/biblioteca">Mi biblioteca</NavLink>
          <NavLink to="/buscar">Buscar</NavLink>
        </nav>

        <div className="barra__acciones">
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
