import { Navigate } from 'react-router-dom'

function RutaProtegida({ token, children }) {
  if (!token) {
    return <Navigate to="/login" />
  }

  return children
}

export default RutaProtegida