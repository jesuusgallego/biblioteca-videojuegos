import Menu from './Menu'

// Estructura común de las páginas con sesión: barra arriba y contenido centrado.
function Layout({ setToken, children }) {
  return (
    <>
      <Menu setToken={setToken} />
      <main className="contenedor">{children}</main>
    </>
  )
}

export default Layout
