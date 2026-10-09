import { useState } from 'react'
import { usePresencia } from './usePresencia'

// Mensaje de error o de confirmación que entra y sale con animación.
//  - tipo: "error" (rojo, role="alert") u "ok" (verde, role="status")
//  - texto: lo que dice. Vacío = no se ve. Basta con pasarle el estado:
//    <Mensaje texto={error} />
//  - className: clases extra (por ejemplo para colocarlo en una rejilla)
function Mensaje({ tipo = "error", texto, className = "" }) {
  // Guardo el último texto no vacío: cuando `texto` pasa a "", el mensaje tiene
  // que seguir diciendo lo mismo mientras se desvanece
  const [ultimo, setUltimo] = useState(texto)
  if (texto && texto !== ultimo) setUltimo(texto)

  const { montado, saliendo } = usePresencia(Boolean(texto))
  if (!montado) return null

  const clases = [
    "mensaje",
    `mensaje--${tipo}`,
    "mensaje--animado",
    saliendo && "mensaje--saliendo",
    className,
  ].filter(Boolean).join(" ")

  return (
    <p className={clases} role={tipo === "error" ? "alert" : "status"}>
      {texto || ultimo}
    </p>
  )
}

export default Mensaje
