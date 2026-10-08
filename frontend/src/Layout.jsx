import { Outlet } from 'react-router-dom'
import Menu from './Menu'

// Estructura común de las páginas con sesión: barra arriba y contenido centrado.
// <Outlet /> es el hueco donde React Router pinta la página hija que toque
// (Biblioteca o Buscar). El Layout se queda siempre en pantalla, así que la
// barra NO se vuelve a crear al cambiar de página.
function Layout({ setToken }) {
  return (
    <>
      <Menu setToken={setToken} />
      <main className="contenedor">
        <Outlet />
      </main>
    </>
  )
}

export default Layout
