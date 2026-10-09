import { useState, useRef } from 'react'
import { apiFetch } from './api'
import { reducirImagen } from './imagen'
import Avatar from './Avatar'
import Cargando from './Cargando'
import SelectorArtwork from './SelectorArtwork'
import Mensaje from './Mensaje'

const BIO_MAX = 300

// Formulario de foto, nombre de usuario y bio.
// La foto puede ser una imagen subida o una ilustración de uno de los juegos de la
// biblioteca. En los dos casos acaba siendo un cuadrado de 256 px en base64.
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
  // Selector de ilustraciones: abierto o no, y las de mis juegos (null = aún sin
  // pedir; se piden la primera vez que se abre)
  const [eligiendo, setEligiendo] = useState(false)
  const [juegos, setJuegos] = useState(null)
  const [errorJuegos, setErrorJuegos] = useState("")
  // Sube cada vez que abro el selector: como es su `key`, así empieza siempre en
  // la lista y no en la ilustración que dejé a medias
  const [aperturas, setAperturas] = useState(0)
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

  async function alternarSelector() {
    const abrir = !eligiendo
    setEligiendo(abrir)
    if (abrir) setAperturas((n) => n + 1)
    if (!abrir || juegos) return

    setErrorJuegos("")
    try {
      const data = await apiFetch('/games/artworks')
      setJuegos(data.games)
    } catch (err) {
      if (err.status === 401) return cerrarSesion()
      setErrorJuegos(err.message)
    }
  }

  function usarIlustracion(foto) {
    setAvatar(foto)
    setEligiendo(false)
    setGuardado(false)
    setError("")
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
            Subir foto
          </button>
          <button
            type="button"
            className="btn btn--secundario"
            aria-expanded={eligiendo}
            onClick={alternarSelector}
          >
            Elegir ilustración de mis juegos
            <svg className="btn__flecha" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {avatar && (
            <button type="button" className="btn btn--peligro" onClick={() => setAvatar(null)}>
              Quitar foto
            </button>
          )}
          <small>Sube un JPG, PNG o WebP (se recorta en cuadrado) o usa una ilustración de uno de tus juegos.</small>
        </div>
      </div>

      {/* El panel está siempre en el DOM y se despliega/pliega con CSS (así la
          animación de cerrar es la de abrir al revés). Cerrado queda oculto
          (visibility: hidden), por lo que no se puede tabular a sus botones. */}
      <div className={eligiendo ? "selector-avatar selector-avatar--abierto" : "selector-avatar"}>
        <div className="selector-avatar__interior">
          <div className="selector-avatar__caja">
            <Mensaje texto={errorJuegos} />
            {!errorJuegos && !juegos && <Cargando texto="Buscando ilustraciones de tus juegos..." />}
            {juegos?.length === 0 && (
              <p className="estado">
                Ninguno de tus juegos tiene ilustraciones en IGDB todavía. Añade más desde Buscar.
              </p>
            )}
            {juegos?.length > 0 && <SelectorArtwork key={aperturas} juegos={juegos} onUsar={usarIlustracion} />}
          </div>
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

      <Mensaje texto={error} />
      <Mensaje tipo="ok" texto={guardado && !hayCambios ? "Perfil actualizado" : ""} />

      <div className="formulario__acciones">
        <button type="submit" className="btn btn--primario" disabled={ocupado || !hayCambios}>
          {ocupado ? <><Cargando tamano="pequeno" /> Guardando...</> : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}

export default EditarPerfil
