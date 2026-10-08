import { Outlet } from 'react-router-dom'
import Menu from './Menu'

// Estructura común de las páginas con sesión: barra arriba y contenido centrado.
// <Outlet /> es donde React Router pinta la página hija (Biblioteca o Buscar).
// El Layout no se desmonta al cambiar de página, así que la barra no se vuelve
// a crear.
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
