import { useId } from 'react'

// Bandera del país de cada idioma, dibujada en SVG. No uso los emojis de bandera
// (🇪🇸, 🇬🇧) porque Windows no los pinta: salen como las letras "ES" y "GB".
//  - codigo: 'es' (España) o 'en' (Reino Unido); el mismo que en idioma.js
// Va en un recuadro de 3:2 con las esquinas redondeadas (ver .bandera en estilos/menus.css).
function BanderaIdioma({ codigo }) {
  // El recorte de la bandera británica necesita un id; useId da uno distinto a
  // cada bandera para que no se pisen si hay varias en la página.
  const idRecorte = useId()

  return (
    <svg
      className="bandera"
      viewBox={codigo === 'es' ? '0 0 24 16' : '0 0 60 40'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {codigo === 'es' ? (
        <>
          <rect width="24" height="16" fill="#aa151b" />
          <rect y="4" width="24" height="8" fill="#f1bf00" />
        </>
      ) : (
        <>
          <rect width="60" height="40" fill="#012169" />
          {/* Aspa blanca de San Andrés y San Patricio en rojo (la roja se recorta
              a medias para que quede desplazada, como en la bandera real) */}
          <path d="M0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="8" />
          <clipPath id={idRecorte}>
            <path d="M30 20h30v20zM30 20v20H0zM30 20H0V0zM30 20V0h30z" />
          </clipPath>
          <path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="5" clipPath={`url(#${idRecorte})`} />
          {/* Cruz de San Jorge */}
          <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
          <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8" />
        </>
      )}
    </svg>
  )
}

export default BanderaIdioma
