import { NavLink } from 'react-router-dom'

// NavLink añade la clase "active" al enlace de la página en la que estás.
function Menu() {
  return (
    <nav>
      <NavLink to="/biblioteca">Mi biblioteca</NavLink>
      {" | "}
      <NavLink to="/buscar">Buscar</NavLink>
    </nav>
  )
}

export default Menu
