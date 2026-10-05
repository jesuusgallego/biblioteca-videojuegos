// Logo de la app: un mando que es a la vez un libro abierto (la biblioteca).
//  - El cuerpo del mando se hunde en el centro como las páginas de un libro.
//  - Cruceta a la izquierda y cuatro botones a la derecha, recortados en el
//    cuerpo (se ve el fondo a través de ellos).
//  - La página derecha es un poco más translúcida que la izquierda.
//  - La cinta es el marcapáginas. Usa currentColor: el CSS le da el color del
//    acento del tema (celeste en oscuro, violeta en claro).
//
// El dibujo está en una cuadrícula de 64x64. Los id (marca-...) son fijos: si
// la marca sale dos veces en la misma página, ambas definen lo mismo y no pasa nada.
function Marca({ grande = false }) {
  return (
    <span className={grande ? "marca marca--grande" : "marca"}>
      <svg className="marca__icono" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="marca-degradado" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stopColor="#5b3df5" />
            <stop offset="1" stopColor="#1b74c8" />
          </linearGradient>

          {/* La silueta del mando/libro, definida una vez y usada dos veces */}
          <path
            id="marca-cuerpo"
            d="M16 14H27Q32 20 37 14H48C55 14 59 19 60.5 28L62 42C62.6 48 59 52 54 52C50 52 48 50 45 46L43 43H21L19 46C16 50 14 52 10 52C5 52 1.4 48 2 42L3.5 28C5 19 9 14 16 14Z"
          />

          {/* Mitades izquierda y derecha: recortan el cuerpo para darle opacidad distinta a cada una */}
          <clipPath id="marca-izquierda"><rect x="0" y="0" width="32" height="64" /></clipPath>
          <clipPath id="marca-derecha"><rect x="32" y="0" width="32" height="64" /></clipPath>

          {/* Máscara: lo blanco se pinta, lo negro queda hueco */}
          <mask id="marca-huecos" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect width="64" height="64" fill="#fff" />
            <g fill="#000">
              {/* cruceta */}
              <rect x="13.5" y="24" width="5" height="14" rx="1.2" />
              <rect x="9" y="28.5" width="14" height="5" rx="1.2" />
              {/* cuatro botones */}
              <circle cx="51.5" cy="26.2" r="2.2" />
              <circle cx="51.5" cy="35.8" r="2.2" />
              <circle cx="46.7" cy="31" r="2.2" />
              <circle cx="56.3" cy="31" r="2.2" />
              {/* hueco del lomo, donde va la cinta */}
              <rect x="28.6" y="16" width="6.8" height="28" />
            </g>
          </mask>
        </defs>

        <g clipPath="url(#marca-izquierda)">
          <use href="#marca-cuerpo" fill="url(#marca-degradado)" mask="url(#marca-huecos)" />
        </g>
        <g clipPath="url(#marca-derecha)" opacity="0.7">
          <use href="#marca-cuerpo" fill="url(#marca-degradado)" mask="url(#marca-huecos)" />
        </g>

        {/* El marcapáginas */}
        <path d="M29.7 17.5V57L32 53.8L34.3 57V17.5Z" fill="currentColor" />
      </svg>
      <span className="marca__texto">Biblioteca</span>
    </span>
  )
}

export default Marca
