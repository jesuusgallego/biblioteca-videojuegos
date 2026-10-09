import { useState, useEffect } from 'react'
import { apiFetch } from './api'
import Cargando from './Cargando'
import CuentaSteam from './CuentaSteam'
import Mensaje from './Mensaje'
import { useIdioma } from './IdiomaContext'

// Cuentas de otras plataformas vinculadas al perfil. De momento solo Steam (la
// única con una API oficial para leer horas y logros); cada plataforma nueva sería
// otro bloque como CuentaSteam.
//  - cerrarSesion(): para cuando el backend responde 401
//  - onSincronizado(): la biblioteca ha cambiado (la página recalcula sus estadísticas)
function CuentasVinculadas({ cerrarSesion, onSincronizado }) {
  const { t } = useIdioma()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelado = false

    apiFetch('/accounts')
      .then((data) => {
        if (!cancelado) setDatos(data)
      })
      .catch((err) => {
        if (cancelado) return
        if (err.status === 401) return cerrarSesion()
        setError(err.message)
      })

    return () => { cancelado = true }
  }, [cerrarSesion])

  if (error) return <Mensaje texto={error} />
  if (!datos) return <Cargando texto={t('steam.cargando')} centrado />

  return (
    <div className="plataformas">
      <CuentaSteam
        inicial={datos.accounts.find((c) => c.platform === 'steam') ?? null}
        disponible={datos.steam_disponible}
        cerrarSesion={cerrarSesion}
        onSincronizado={onSincronizado}
      />
    </div>
  )
}

export default CuentasVinculadas
