import { useState } from 'react'
import { apiFetch } from './api'
import Cargando from './Cargando'
import ConexionSteam from './ConexionSteam'
import DialogoConfirmar from './DialogoConfirmar'
import IconoSteam from './IconoSteam'
import Mensaje from './Mensaje'
import { useIdioma } from './IdiomaContext'
import { useCambioVista } from './useCambioVista'
import { usePresencia } from './usePresencia'

// Tarjeta de Steam dentro de "Cuentas vinculadas": una cabecera con el logo y el
// estado, y debajo dos vistas entre las que cambia con animación (useCambioVista):
//  - sin cuenta: formulario para vincularla (con la escena animada al conectar)
//  - con cuenta: sus datos, sincronizar y desvincular
// El estado de la cuenta vive aquí; CuentasVinculadas solo me da la inicial.
//  - disponible: si el servidor tiene la clave de Steam (si no, no se puede vincular)
//  - onSincronizado(): avisa a la página de que la biblioteca ha cambiado (al
//    sincronizar o al desvincular, que borra los juegos importados)
function CuentaSteam({ inicial, disponible, cerrarSesion, onSincronizado }) {
  const { t } = useIdioma()
  const { saliendo, cambiar } = useCambioVista()
  const [cuenta, setCuenta] = useState(inicial)
  // true si al vincular el perfil resultó ser privado (hay que abrirlo para sincronizar)
  const [privado, setPrivado] = useState(false)

  return (
    <article className="plataforma">
      <header className="plataforma__cabecera">
        <span className="plataforma__logo"><IconoSteam tamano={26} /></span>
        <h3 className="plataforma__nombre">{t('steam.titulo')}</h3>
        <span className={cuenta ? "plataforma__estado plataforma__estado--ok" : "plataforma__estado"}>
          {cuenta ? t('steam.estadoVinculada') : t('steam.estadoSinVincular')}
        </span>
        {/* Logo gigante y apagado de adorno, a la derecha */}
        <span className="plataforma__marca-agua" aria-hidden="true"><IconoSteam tamano={150} /></span>
      </header>

      <div className="plataforma__cuerpo">
        {/* La key hace que, al cambiar de vista, React cree un elemento nuevo y
            vuelva a reproducirse la animación de entrada de .vista */}
        <div key={cuenta ? "vinculada" : "formulario"} className={saliendo ? "vista vista--saliendo" : "vista"}>
          {cuenta
            ? (
              <SteamVinculada
                cuenta={cuenta}
                privado={privado}
                cerrarSesion={cerrarSesion}
                onSincronizada={(actualizada) => {
                  setCuenta(actualizada)
                  setPrivado(false)
                  onSincronizado()
                }}
                onDesvinculada={() => {
                  cambiar(() => setCuenta(null))
                  onSincronizado()
                }}
              />
            )
            : (
              <SteamVincular
                disponible={disponible}
                cerrarSesion={cerrarSesion}
                onVinculada={(nueva, publico) => cambiar(() => {
                  setCuenta(nueva)
                  setPrivado(!publico)
                })}
              />
            )}
        </div>
      </div>
    </article>
  )
}

function SteamVincular({ disponible, cerrarSesion, onVinculada }) {
  const { t } = useIdioma()
  const [perfil, setPerfil] = useState("")
  // La importación solo se elige aquí, al vincular: luego no se puede cambiar
  const [importar, setImportar] = useState(false)
  const [error, setError] = useState("")
  // Qué enseña la escena animada: "inactivo" (nada, se ve el formulario),
  // "conectando" (esperando al backend) o "conectado" (ya vinculada)
  const [fase, setFase] = useState("inactivo")
  // La cuenta recién vinculada, guardada hasta que acabe la animación
  const [resultado, setResultado] = useState(null)
  // usePresencia mantiene la escena montada un rato más al dejar de ser visible,
  // para que se desvanezca si la vinculación falla
  const { montado, saliendo } = usePresencia(fase !== "inactivo")

  async function handleVincular(e) {
    e.preventDefault()
    setError("")
    setFase("conectando")
    try {
      const data = await apiFetch('/accounts/steam', { method: 'PUT', body: { perfil, importar } })
      setResultado(data)
      setFase("conectado")
    } catch (err) {
      setFase("inactivo")
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
    }
  }

  return (
    <>
      <form className="formulario" onSubmit={handleVincular}>
        <p className="plataforma__ayuda">{t('steam.ayuda')}</p>

        {!disponible && <Mensaje texto={t('steam.noDisponible')} />}

        <label className="campo">
          <span>{t('steam.campoPerfil')}</span>
          <input
            type="text"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            placeholder={t('steam.placeholder')}
            autoComplete="off"
            spellCheck={false}
            disabled={!disponible || fase !== "inactivo"}
            required
          />
        </label>

        <label className="casilla">
          <input type="checkbox" checked={importar} onChange={(e) => setImportar(e.target.checked)} disabled={!disponible || fase !== "inactivo"} />
          <span>
            {t('steam.importar')}
            <small>{t('steam.importarAyuda')}</small>
          </span>
        </label>

        <Mensaje texto={error} />

        <div className="formulario__acciones">
          <button type="submit" className="btn btn--steam" disabled={!disponible || fase !== "inactivo" || perfil.trim() === ""}>
            <IconoSteam tamano={16} /> {t('steam.vincular')}
          </button>
        </div>
      </form>

      {montado && (
        <ConexionSteam
          conectado={fase === "conectado"}
          nombre={resultado?.account.display_name}
          avatar={resultado?.account.avatar_url}
          saliendo={saliendo}
          onTerminada={() => onVinculada(resultado.account, resultado.publico)}
        />
      )}
    </>
  )
}

function SteamVinculada({ cuenta, privado, cerrarSesion, onSincronizada, onDesvinculada }) {
  const { t, locale } = useIdioma()
  const [sincronizando, setSincronizando] = useState(false)
  const [desvinculando, setDesvinculando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState("")
  const [resultado, setResultado] = useState("")

  async function handleSincronizar() {
    setError("")
    setResultado("")
    setSincronizando(true)
    try {
      const data = await apiFetch('/accounts/steam/sync', { method: 'POST' })
      setResultado(t('steam.resumen', {
        actualizados: data.resumen.actualizados,
        anadidos: data.resumen.anadidos,
        sinEmparejar: data.resumen.sin_emparejar,
      }))
      onSincronizada(data.account)
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
    } finally {
      setSincronizando(false)
    }
  }

  async function handleDesvincular() {
    setConfirmando(false)
    setError("")
    setResultado("")
    setDesvinculando(true)
    try {
      await apiFetch('/accounts/steam', { method: 'DELETE' })
      onDesvinculada()
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
    } finally {
      setDesvinculando(false)
    }
  }

  const ultimaSync = cuenta.last_sync_at
    ? new Date(cuenta.last_sync_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : t('steam.nuncaSync')

  // Lo elegido al vincular (ya no se puede cambiar): solo informa
  let importacion = t('steam.importacionNo')
  if (cuenta.import_games) {
    importacion = cuenta.imported_count > 0
      ? t('steam.importacionActivaN', { n: cuenta.imported_count })
      : t('steam.importacionActiva')
  }

  // Solo enlazo a Steam: así un dato raro de la BD no puede meter otra URL
  const enlacePerfil = cuenta.profile_url?.startsWith('https://steamcommunity.com/') ? cuenta.profile_url : null
  const ocupado = sincronizando || desvinculando

  return (
    <div className="steam-cuenta">
      <div className="steam-cuenta__perfil">
        {cuenta.avatar_url && <img className="steam-cuenta__avatar" src={cuenta.avatar_url} alt="" />}
        <div>
          <p className="steam-cuenta__nombre">{cuenta.display_name}</p>
          {enlacePerfil && (
            <a className="steam-cuenta__enlace" href={enlacePerfil} target="_blank" rel="noreferrer">
              {t('steam.verPerfil')}
            </a>
          )}
        </div>
      </div>

      <dl className="datos-cuenta">
        <div className="dato-cuenta">
          <dt>{t('steam.datoSync')}</dt>
          <dd>{ultimaSync}</dd>
        </div>
        <div className="dato-cuenta">
          <dt>{t('steam.datoImportacion')}</dt>
          <dd className={cuenta.import_games ? "dato-cuenta__valor--ok" : undefined}>{importacion}</dd>
        </div>
      </dl>

      <Mensaje tipo="aviso" texto={privado ? t('steam.perfilPrivado') : ""} />
      <Mensaje texto={error} />
      <Mensaje tipo="ok" texto={resultado} />

      <div className="formulario__acciones">
        <button type="button" className="btn btn--peligro" onClick={() => setConfirmando(true)} disabled={ocupado}>
          {desvinculando ? <><Cargando tamano="pequeno" /> {t('steam.desvinculando')}</> : t('steam.desvincular')}
        </button>
        <button type="button" className="btn btn--steam" onClick={handleSincronizar} disabled={ocupado}>
          {sincronizando ? <><Cargando tamano="pequeno" /> {t('steam.sincronizando')}</> : t('steam.sincronizar')}
        </button>
      </div>

      {confirmando && (
        <DialogoConfirmar
          titulo={t('steam.desvincularTitulo')}
          mensaje={cuenta.imported_count > 0
            ? t('steam.desvincularMensajeImportados', { n: cuenta.imported_count })
            : t('steam.desvincularMensaje')}
          textoConfirmar={t('steam.desvincular')}
          onConfirmar={handleDesvincular}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </div>
  )
}

export default CuentaSteam
