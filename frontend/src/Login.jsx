import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from './api'

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
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Iniciar sesión</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  )
}

export default Login