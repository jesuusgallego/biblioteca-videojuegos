import { useState, useRef } from 'react'
import { apiFetch } from './api'
import { reducirImagen } from './imagen'
import Avatar from './Avatar'
import Cargando from './Cargando'

const BIO_MAX = 300

// Formulario de foto, nombre de usuario y bio.
//  - perfil: los datos guardados ahora mismo
//  - onGuardado(usuario): el padre actualiza el perfil compartido con la barra
//  - cerrarSesion(): para cuando el backend dice 401 (sesión caducada)
// Los campos son copias locales: no se guarda nada hasta pulsar "Guardar".
function EditarPerfil({ perfil, onGuardado, cerrarSesion }) {
  const [username, setUsername] = useState(perfil.username)
  const [bio, setBio] = useState(perfil.bio ?? "")
  const [avatar, setAvatar] = useState(perfil.avatar)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState("")
  const [guardado, setGuardado] = useState(false)
  const archivoRef = useRef(null)

  // Solo envío lo que ha cambiado, y "Guardar" se activa solo si hay algo que enviar
  const cambios = {}
  if (username.trim() !== perfil.username) cambios.username = username.trim()
  if (bio.trim() !== (perfil.bio ?? "")) cambios.bio = bio.trim() || null
  if (avatar !== perfil.avatar) cambios.avatar = avatar
  const hayCambios = Object.keys(cambios).length > 0

  async function elegirFoto(e) {
    const archivo = e.target.files[0]
    // Vacío el input para poder volver a elegir el mismo archivo más tarde
    e.target.value = ""
    if (!archivo) return

    setError("")
    setGuardado(false)
    try {
      setAvatar(await reducirImagen(archivo))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setError("")
    setGuardado(false)

    if (username.trim() === "") {
      setError("El nombre de usuario es obligatorio")
      return
    }

    setOcupado(true)
    try {
      const data = await apiFetch('/profile', { method: 'PATCH', body: cambios })
      onGuardado(data.user)
      setGuardado(true)
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setError(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form className="formulario" onSubmit={handleGuardar}>
      <div className="foto-perfil">
        <Avatar usuario={{ username, avatar }} tamano="grande" />
        <div className="foto-perfil__acciones">
          <input
            ref={archivoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={elegirFoto}
            hidden
          />
          <button type="button" className="btn btn--secundario" onClick={() => archivoRef.current.click()}>
            Cambiar foto
          </button>
          {avatar && (
            <button type="button" className="btn btn--peligro" onClick={() => setAvatar(null)}>
              Quitar foto
            </button>
          )}
          <small>JPG, PNG o WebP. Se recorta en cuadrado.</small>
        </div>
      </div>

      <label className="campo">
        <span>Nombre de usuario</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={50}
          autoComplete="username"
          required
        />
      </label>

      <label className="campo">
        <span>Sobre mí</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          placeholder="Qué te gusta jugar, tu género favorito..."
        />
        <small>{bio.length}/{BIO_MAX}</small>
      </label>

      {error && <p className="mensaje mensaje--error" role="alert">{error}</p>}
      {guardado && !hayCambios && <p className="mensaje mensaje--ok" role="status">Perfil actualizado</p>}

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--primario" disabled={ocupado || !hayCambios}>
          {ocupado ? <><Cargando tamano="pequeno" /> Guardando...</> : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}

export default EditarPerfil
