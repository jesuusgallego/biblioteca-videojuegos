import { useState } from 'react'
import { apiFetch } from './api'
import Cargando from './Cargando'
import DialogoConfirmar from './DialogoConfirmar'

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
      setError("El email no tiene un formato válido")
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
      <h3 className="cuenta__titulo">Email</h3>
      <label className="campo">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="campo">
        <span>Contraseña actual</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>

      {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      {guardado && <p className="mensaje mensaje--ok" role="status">Email actualizado</p>}

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--secundario" disabled={ocupado || email === perfil.email}>
          {ocupado ? <><Cargando tamano="pequeno" /> Guardando...</> : "Cambiar email"}
        </button>
      </div>
    </form>
  )
}

function FormularioContrasena({ cerrarSesion }) {
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
      setError("La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")
      return
    }

    if (nueva !== repetida) {
      setError("Las contraseñas nuevas no coinciden")
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
      <h3 className="cuenta__titulo">Contraseña</h3>
      <label className="campo">
        <span>Contraseña actual</span>
        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required />
      </label>
      <label className="campo">
        <span>Nueva contraseña</span>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
      </label>
      <label className="campo">
        <span>Repite la nueva contraseña</span>
        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" required />
      </label>

      {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      {guardado && <p className="mensaje mensaje--ok" role="status">Contraseña actualizada</p>}

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--secundario" disabled={ocupado}>
          {ocupado ? <><Cargando tamano="pequeno" /> Guardando...</> : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  )
}

// Borrar la cuenta: escribo la contraseña y, además, una ventana de confirmación
// avisa de que no hay vuelta atrás.
function ZonaPeligro({ cerrarSesion }) {
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
      <h3 className="cuenta__titulo">Borrar cuenta</h3>
      <p className="cuenta__aviso">
        Se eliminarán tu cuenta y toda tu biblioteca. No se puede deshacer.
      </p>
      <label className="campo">
        <span>Contraseña actual</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>

      {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--peligro" disabled={ocupado || password === ""}>
          {ocupado ? <><Cargando tamano="pequeno" /> Borrando...</> : "Borrar mi cuenta"}
        </button>
      </div>

      {confirmando && (
        <DialogoConfirmar
          titulo="¿Borrar tu cuenta?"
          mensaje="Perderás tu perfil y todos los juegos de tu biblioteca. Esta acción no se puede deshacer."
          textoConfirmar="Borrar para siempre"
          onConfirmar={borrarCuenta}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </form>
  )
}

export default CuentaPerfil
