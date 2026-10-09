import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiFetch } from './api'
import Avatar from './Avatar'
import Cargando from './Cargando'
import EstadisticasPerfil from './EstadisticasPerfil'
import EditarPerfil from './EditarPerfil'
import CuentaPerfil from './CuentaPerfil'
import Mensaje from './Mensaje'
import { useIdioma } from './IdiomaContext'

// Página del perfil: cabecera, estadísticas de la biblioteca, edición del perfil
// (foto, nombre, bio) y ajustes de cuenta (email, contraseña, borrar cuenta).
//  - El perfil (nombre, foto...) llega de Layout, que lo comparte con la barra
//    para que el avatar se actualice a la vez en los dos sitios.
//  - Las estadísticas las pido aquí, cada vez que entro, para que estén al día.
function Perfil({ setToken }) {
  const { t, locale } = useIdioma()
  const { perfil, setPerfil } = useOutletContext()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState("")

  function cerrarSesion() {
    localStorage.removeItem("token")
    setToken("")
  }

  useEffect(() => {
    let cancelado = false

    apiFetch('/profile/stats')
      .then((data) => {
        if (!cancelado) setDatos(data)
      })
      .catch((err) => {
        if (cancelado) return

        if (err.status === 401) {
          localStorage.removeItem("token")
          setToken("")
          return
        }

        setError(err.message)
      })

    return () => { cancelado = true }
  }, [setToken])

  // Hasta que llegue el perfil no hay nada que enseñar
  if (!perfil) return <Cargando texto={t('perfil.cargando')} tamano="grande" centrado />

  const miembroDesde = new Date(perfil.created_at).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="perfil">
      <header className="perfil__cabecera">
        <Avatar usuario={perfil} tamano="grande" />
        <div className="perfil__datos">
          <h1 className="titulo-pagina">{perfil.username}</h1>
          <p className="perfil__meta">{t('perfil.miembroDesde', { fecha: miembroDesde })}</p>
          {perfil.bio
            ? <p className="perfil__bio">{perfil.bio}</p>
            : <p className="perfil__bio perfil__bio--vacia">{t('perfil.sinBio')}</p>}
        </div>
      </header>

      <section className="panel" aria-labelledby="perfil-estadisticas">
        <h2 id="perfil-estadisticas" className="titulo-seccion">{t('perfil.estadisticas')}</h2>
        <Mensaje texto={error} />
        {!error && !datos && <Cargando texto={t('perfil.calculando')} centrado />}
        {datos && <EstadisticasPerfil stats={datos.stats} mejores={datos.mejores} />}
      </section>

      <section className="panel" aria-labelledby="perfil-editar">
        <h2 id="perfil-editar" className="titulo-seccion">{t('perfil.editar')}</h2>
        <EditarPerfil perfil={perfil} onGuardado={setPerfil} cerrarSesion={cerrarSesion} />
      </section>

      <section className="panel" aria-labelledby="perfil-cuenta">
        <h2 id="perfil-cuenta" className="titulo-seccion">{t('perfil.cuenta')}</h2>
        <CuentaPerfil perfil={perfil} onGuardado={setPerfil} cerrarSesion={cerrarSesion} />
      </section>
    </div>
  )
}

export default Perfil
