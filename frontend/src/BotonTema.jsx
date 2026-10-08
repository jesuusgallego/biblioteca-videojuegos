import { useState } from 'react'
import { temaActual, aplicarTema } from './tema'

// Botón sol/luna para alternar entre tema oscuro y claro.
function BotonTema() {
  // Leo el tema que ya puso el script de index.html
  const [tema, setTema] = useState(temaActual)

  function alternar() {
    const nuevo = tema === "oscuro" ? "claro" : "oscuro"
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  const etiqueta = tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"

  return (
    <button
      type="button"
      className="btn-icono"
      onClick={alternar}
      aria-label={etiqueta}
      title={etiqueta}
    >
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
          // En oscuro enseño el sol: es el tema al que se cambia al pulsar
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        ) : (
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        )}
      </svg>
    </button>
  )
}

export default BotonTema
