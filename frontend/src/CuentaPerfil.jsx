import { useState } from 'react'
import { apiFetch } from './api'
import Cargando from './Cargando'
import DialogoConfirmar from './DialogoConfirmar'
import Mensaje from './Mensaje'
import { useIdioma } from './IdiomaContext'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

// Ajustes de la cuenta: email, contraseña y borrar la cuenta. Los tres piden la
// contraseña actual, porque son cambios delicados (si alguien dejara la sesión
// abierta en un ordenador, no podría robarte la cuenta con solo esto).
function CuentaPerfil({ perfil, onGuardado, cerrarSesion }) {
  return (
    <div className="cuenta">
      <FormularioEmail perfil={perfil} onGuardado={onGuardado} cerrarSesion={cerrarSesion} />
      <FormularioContrasena cerrarSesion={cerrarSesion} />
      <ZonaPeligro cerrarSesion={cerrarSesion} />
    </div>
  )
}

function FormularioEmail({ perfil, onGuardado, cerrarSesion }) {
  const { t } = useIdioma()
  const [email, setEmail] = useState(perfil.email)
  const [password, setPassword] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")
  const [guardado, setGuardado] = useState(false)

  async function handleEmail(e) {
    e.preventDefault()
    setError("")
    setGuardado(false)

    if (!emailRegex.test(email)) {
      setError(t('validacion.emailInvalido'))
      return
    }

    setOcupado(true)
    try {
      const data = await apiFetch('/profile/email', {
        method: 'PATCH',
        body: { email, current_password: password },
      })
      onGuardado(data.user)
      setPassword("")
      setGuardado(true)
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className="formulario cuenta__bloque" onSubmit={handleEmail}>
      <h3 className="cuenta__titulo">{t('cuenta.emailTitulo')}</h3>
      <label className="campo">
        <span>{t('cuenta.email')}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="campo">
        <span>{t('cuenta.passwordActual')}</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>

      <Mensaje texto={error} />
      <Mensaje tipo="ok" texto={guardado ? t('cuenta.emailActualizado') : ""} />

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--secundario" disabled={ocupado || email === perfil.email}>
          {ocupado ? <><Cargando tamano="pequeno" /> {t('comun.guardando')}</> : t('cuenta.cambiarEmail')}
        </button>
      </div>
    </form>
  )
}

function FormularioContrasena({ cerrarSesion }) {
  const { t } = useIdioma()
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetida, setRepetida] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")
  const [guardado, setGuardado] = useState(false)

  async function handlePassword(e) {
    e.preventDefault()
    setError("")
    setGuardado(false)

    if (!passwordRegex.test(nueva)) {
      setError(t('cuenta.passwordNuevaRequisitos'))
      return
    }

    if (nueva !== repetida) {
      setError(t('cuenta.passwordNoCoinciden'))
      return
    }

    setOcupado(true)
    try {
      await apiFetch('/profile/password', {
        method: 'PATCH',
        body: { current_password: actual, new_password: nueva },
      })
      setActual("")
      setNueva("")
      setRepetida("")
      setGuardado(true)
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className="formulario cuenta__bloque" onSubmit={handlePassword}>
      <h3 className="cuenta__titulo">{t('cuenta.passwordTitulo')}</h3>
      <label className="campo">
        <span>{t('cuenta.passwordActual')}</span>
        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required />
      </label>
      <label className="campo">
        <span>{t('cuenta.passwordNueva')}</span>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
      </label>
      <label className="campo">
        <span>{t('cuenta.passwordRepite')}</span>
        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" required />
      </label>

      <Mensaje texto={error} />
      <Mensaje tipo="ok" texto={guardado ? t('cuenta.passwordActualizada') : ""} />

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--secundario" disabled={ocupado}>
          {ocupado ? <><Cargando tamano="pequeno" /> {t('comun.guardando')}</> : t('cuenta.cambiarPassword')}
        </button>
      </div>
    </form>
  )
}

// Borrar la cuenta: escribo la contraseña y, además, una ventana de confirmación
// avisa de que no hay vuelta atrás.
function ZonaPeligro({ cerrarSesion }) {
  const { t } = useIdioma()
  const [password, setPassword] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")

  function pedirConfirmacion(e) {
    e.preventDefault()
    setError("")
    setConfirmando(true)
  }

  async function borrarCuenta() {
    setConfirmando(false)
    setOcupado(true)
    try {
      await apiFetch('/profile', { method: 'DELETE', body: { password } })
      // La cuenta ya no existe: cierro sesión y RutaProtegida me lleva al login
      cerrarSesion()
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
      setOcupado(false)
    }
  }

  return (
    <form className="formulario cuenta__bloque cuenta__bloque--peligro" onSubmit={pedirConfirmacion}>
      <h3 className="cuenta__titulo">{t('cuenta.borrarTitulo')}</h3>
      <p className="cuenta__aviso">
        {t('cuenta.borrarAviso')}
      </p>
      <label className="campo">
        <span>{t('cuenta.passwordActual')}</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>

      <Mensaje texto={error} />

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--peligro" disabled={ocupado || password === ""}>
          {ocupado ? <><Cargando tamano="pequeno" /> {t('cuenta.borrando')}</> : t('cuenta.borrarBoton')}
        </button>
      </div>

      {confirmando && (
        <DialogoConfirmar
          titulo={t('cuenta.borrarConfirmarTitulo')}
          mensaje={t('cuenta.borrarConfirmarMensaje')}
          textoConfirmar={t('cuenta.borrarConfirmar')}
          onConfirmar={borrarCuenta}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </form>
  )
}

export default CuentaPerfil
