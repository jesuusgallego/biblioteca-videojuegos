// Todo el acceso al backend pasa por aquí: la URL base, el token y el manejo de
// errores. El resto de la app llama a apiFetch en vez de a fetch.
const URL_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Uso: const data = await apiFetch('/games', { method: 'POST', body: { name: 'Zelda' } })
//  - `body` es un objeto normal; aquí lo convierto a JSON.
//  - Añado el token de localStorage si existe (login y registro no lo tienen).
//  - Si el backend responde con error lanzo un Error con `message` (el data.error
//    del backend) y `status` (código HTTP). Qué hacer con un 401 lo decide quien
//    llama: en login significa "contraseña incorrecta".
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
    // Si cancelé la petición con AbortController, dejo pasar el error tal cual
    if (err.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor', { cause: err })
  }

  // Si la respuesta no es JSON (por ejemplo un error HTML) sigo con {}
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || 'Error inesperado del servidor')
    error.status = res.status
    throw error
  }

  return data
}
