import { useState } from 'react'
import { apiFetch } from './api'
import CampoContrasena from './CampoContrasena'
import Cargando from './Cargando'
import DialogoConfirmar from './DialogoConfirmar'
import Mensaje from './Mensaje'
import { useIdioma } from './IdiomaContext'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

// Lo que tiene que cumplir una contraseña nueva. Son las mismas reglas que
// passwordRegex (y que valida el backend), una por una para poder enseñar cuáles
// cumple ya la que se está escribiendo.
const REQUISITOS = [
  { id: 'longitud', texto: 'password.req.longitud', cumple: (v) => v.length >= 8 },
  { id: 'mayuscula', texto: 'password.req.mayuscula', cumple: (v) => /[A-Z]/.test(v) },
  { id: 'minuscula', texto: 'password.req.minuscula', cumple: (v) => /[a-z]/.test(v) },
  { id: 'numero', texto: 'password.req.numero', cumple: (v) => /\d/.test(v) },
]

// Ajustes de seguridad de la cuenta: email, contraseña y borrar la cuenta. Los tres
// piden la contraseña actual, porque son cambios delicados (si alguien dejara la
// sesión abierta en un ordenador, no podría robarte la cuenta con solo esto).
function CuentaPerfil({ perfil, onGuardado, cerrarSesion }) {
  return (
    <div className="ajustes">
      <FormularioEmail perfil={perfil} onGuardado={onGuardado} cerrarSesion={cerrarSesion} />
      <FormularioContrasena cerrarSesion={cerrarSesion} />
      <ZonaPeligro cerrarSesion={cerrarSesion} />
    </div>
  )
}

// Cabecera de cada tarjeta de ajustes: icono, título y una línea de ayuda
function CabeceraAjuste({ icono, titulo, ayuda }) {
  return (
    <header className="ajuste__cabecera">
      <span className="ajuste__icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icono}
        </svg>
      </span>
      <div>
        <h3 className="ajuste__titulo">{titulo}</h3>
        <p className="ajuste__ayuda">{ayuda}</p>
      </div>
    </header>
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
    <form className="formulario ajuste" onSubmit={handleEmail}>
      <CabeceraAjuste
        icono={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>}
        titulo={t('cuenta.emailTitulo')}
        ayuda={t('cuenta.emailAyuda')}
      />

      <label className="campo">
        <span>{t('cuenta.email')}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <CampoContrasena
        etiqueta={t('cuenta.passwordActual')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

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

// Lista de requisitos de la contraseña nueva: cada uno se marca con un tic cuando se
// cumple, y una barra de fuerza se llena según cuántos van. Solo es una guía: la
// validación de verdad la hace passwordRegex al enviar y, después, el backend.
function RequisitosContrasena({ valor }) {
  const { t } = useIdioma()
  const cumplidos = REQUISITOS.filter((r) => r.cumple(valor)).length

  return (
    <div className="requisitos">
      {/* data-fuerza (0 a 4) hace que el CSS pinte la barra de un color u otro */}
      <div className="fuerza" data-fuerza={cumplidos} aria-hidden="true">
        <span className="fuerza__relleno" style={{ '--p': cumplidos / REQUISITOS.length }} />
      </div>
      <ul className="requisitos__lista" aria-label={t('password.req.titulo')}>
        {REQUISITOS.map((r) => {
          const cumple = r.cumple(valor)
          return (
            <li key={r.id} className={cumple ? "requisito requisito--ok" : "requisito"}>
              <span className="requisito__marca" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </span>
              {t(r.texto)}
              <span className="sr-only">{cumple ? t('password.req.cumplido') : t('password.req.pendiente')}</span>
            </li>
          )
        })}
      </ul>
    </div>
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

  // Aviso en vivo bajo "Repite la contraseña": solo cuando ya han escrito algo
  const repiteAviso = repetida === "" ? "" : (nueva === repetida ? t('password.coinciden') : t('cuenta.passwordNoCoinciden'))

  return (
    <form className="formulario ajuste" onSubmit={handlePassword}>
      <CabeceraAjuste
        icono={<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>}
        titulo={t('cuenta.passwordTitulo')}
        ayuda={t('cuenta.passwordAyuda')}
      />

      <CampoContrasena
        etiqueta={t('cuenta.passwordActual')}
        value={actual}
        onChange={(e) => setActual(e.target.value)}
        autoComplete="current-password"
      />
      <CampoContrasena
        etiqueta={t('cuenta.passwordNueva')}
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        autoComplete="new-password"
      >
        <RequisitosContrasena valor={nueva} />
      </CampoContrasena>
      <CampoContrasena
        etiqueta={t('cuenta.passwordRepite')}
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        autoComplete="new-password"
      >
        <Mensaje tipo={nueva === repetida ? "ok" : "aviso"} texto={repiteAviso} className="mensaje--compacto" />
      </CampoContrasena>

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
    <form className="formulario ajuste ajuste--peligro" onSubmit={pedirConfirmacion}>
      <CabeceraAjuste
        icono={<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m6 6 1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>}
        titulo={t('cuenta.borrarTitulo')}
        ayuda={t('cuenta.borrarAviso')}
      />

      <CampoContrasena
        etiqueta={t('cuenta.passwordActual')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

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
