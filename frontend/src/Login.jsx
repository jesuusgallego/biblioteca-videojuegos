import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from './api'
import Marca from './Marca'
import BotonTema from './BotonTema'

function Login({ setToken }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function handleLogin(e) {
    e.preventDefault()
    setError("")

    if (!emailRegex.test(email)) {
      setError("El email no tiene un formato válido")
      return
    }

    if (password === "") {
      setError("Introduce tu contraseña")
      return
    }

    apiFetch('/auth/login', { method: 'POST', body: { email, password } })
      .then(data => {
        setToken(data.token)
        localStorage.setItem("token", data.token)
        navigate('/biblioteca')
      })
      .catch(err => setError(err.message))
  }

  return (
    <main className="auth">
      <div className="auth__tema">
        <BotonTema />
      </div>

      <div className="auth__tarjeta">
        <Marca grande />
        <h1 className="auth__titulo">Iniciar sesión</h1>

        <form className="formulario" onSubmit={handleLogin}>
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
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}

          <button type="submit" className="btn btn--primario btn--block">
            Iniciar sesión
          </button>
        </form>

        <p className="auth__pie">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </main>
  )
}

export default Login
