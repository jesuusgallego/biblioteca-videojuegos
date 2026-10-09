import { useState } from 'react'
import { temaActual, alternarTema } from './tema'

// Icono del interruptor de tema. Enseña el del tema AL QUE se cambia al pulsar:
// en oscuro el sol, en claro la luna. Lo uso en el botón de abajo y en el
// desplegable de la barra (MenuUsuario).
export function IconoTema({ tema }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tema === "oscuro" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      ) : (
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      )}
    </svg>
  )
}

// Botón sol/luna para alternar entre tema oscuro y claro. Lo usan el login y el
// registro; dentro de la app el interruptor está en el menú de la foto de perfil.
function BotonTema() {
  // Leo el tema que ya puso el script de index.html
  const [tema, setTema] = useState(temaActual)

  const etiqueta = tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"

  return (
    <button
      type="button"
      className="btn-icono"
      onClick={() => setTema(alternarTema())}
      aria-label={etiqueta}
    >
      <IconoTema tema={tema} />
    </button>
  )
}

export default BotonTema
