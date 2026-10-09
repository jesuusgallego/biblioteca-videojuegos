import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from './api'
import Marca from './Marca'
import BotonTema from './BotonTema'
import Cargando from './Cargando'
import Mensaje from './Mensaje'

function Registro() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

  function handleRegistro(e) {
    e.preventDefault()
    setError("")

    if (username.trim() === "") {
      setError("El nombre de usuario es obligatorio")
      return
    }

    if (!emailRegex.test(email)) {
      setError("El email no tiene un formato válido")
      return
    }

    if (!passwordRegex.test(password)) {
      setError("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número")
      return
    }

    setEnviando(true)
    apiFetch('/auth/register', {
      method: 'POST',
      body: { username: username.trim(), email, password }
    })
      .then(() => navigate('/login'))
      .catch(err => setError(err.message))
      .finally(() => setEnviando(false))
  }

  return (
    <main className="auth">
      <div className="auth__tema">
        <BotonTema />
      </div>

      <div className="auth__tarjeta">
        <Marca grande />
        <h1 className="auth__titulo">Crear cuenta</h1>

        <form className="formulario" onSubmit={handleRegistro}>
          <label className="campo">
            <span>Nombre de usuario</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="campo">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <small>Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
          </label>

          <Mensaje texto={error} />

          <button type="submit" className="btn btn--primario btn--block" disabled={enviando}>
            {enviando ? <><Cargando tamano="pequeno" /> Registrando...</> : "Registrarse"}
          </button>
        </form>

        <p className="auth__pie">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </main>
  )
}

export default Registro
