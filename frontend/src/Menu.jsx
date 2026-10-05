import { NavLink } from 'react-router-dom'

// NavLink añade la clase "active" al enlace de la página en la que estás.
// Cerrar sesión borra el token; RutaProtegida ve que ya no hay y redirige al login.
function Menu({ setToken }) {
  function cerrarSesion() {
    localStorage.removeItem("token")
    setToken("")
  }

  return (
    <nav>
      <NavLink to="/biblioteca">Mi biblioteca</NavLink>
      {" | "}
      <NavLink to="/buscar">Buscar</NavLink>
      {" | "}
      <button onClick={cerrarSesion}>Cerrar sesión</button>
    </nav>
  )
}

export default Menu
