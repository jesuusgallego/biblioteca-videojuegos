import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from './api'

function Registro() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
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

    apiFetch('/auth/register', {
      method: 'POST',
      body: { username: username.trim(), email, password }
    })
      .then(() => navigate('/login'))
      .catch(err => setError(err.message))
  }

  return (
    <form onSubmit={handleRegistro}>
      <input
        type="text"
        placeholder="Nombre de usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
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
      <button type="submit">Registrarse</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  )
}

export default Registro