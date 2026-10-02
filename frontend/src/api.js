// Capa de acceso al backend: un único sitio con la URL base, el token y el
// manejo de errores. El resto de la app llama a apiFetch en vez de a fetch.
const URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Uso: const data = await apiFetch('/games', { method: 'POST', body: { name: 'Zelda' } })
//  - `body` es un objeto normal; aquí se convierte a JSON.
//  - Añade el token de localStorage si existe (login y registro no lo tienen).
//  - Si el backend responde con error, lanza un Error con `message` (el
//    data.error del backend) y `status` (código HTTP). Decidir qué hacer con
//    un 401 es cosa de quien llama: en login significa "contraseña incorrecta".
export async function apiFetch(ruta, { body, headers, ...resto } = {}) {
  const token = localStorage.getItem('token')

  let res
  try {
    res = await fetch(`${URL_BASE}${ruta}`, {
      ...resto, // method, signal, etc.
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  } catch (err) {
    // La petición cancelada con AbortController debe llegar intacta
    if (err.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor', { cause: err })
  }

  // Si la respuesta no es JSON (por ejemplo un error HTML), seguimos con {}
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || 'Error inesperado del servidor')
    error.status = res.status
    throw error
  }

  return data
}
