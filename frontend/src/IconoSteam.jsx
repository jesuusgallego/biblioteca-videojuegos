// Logo de Steam (Simple Icons, https://simpleicons.org). Es una marca de Valve; lo
// uso solo para indicar que la cuenta vinculada es de Steam. Se pinta con el color
// del texto (currentColor), así sigue al tema claro/oscuro.
//  - tamano: lado en píxeles
//  - enCirculo: dibuja detrás un círculo (con aro) en el MISMO svg, para la insignia
//    de las tarjetas. Así el logo y el círculo comparten ejes y se rasterizan juntos:
//    con un div redondo y un svg dentro, el borde se ajusta a píxeles enteros y el
//    logo no, y en algunas pantallas quedaban medio píxel desalineados. La
//    viewBox crece (de 24 a 36 unidades, el logo queda en el centro) para dar sitio.
function IconoSteam({ tamano = 20, enCirculo = false }) {
  return (
    <svg
      viewBox={enCirculo ? "-6 -6 36 36" : "0 0 24 24"}
      width={tamano}
      height={tamano}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {enCirculo && <circle className="insignia-steam__fondo" cx="12" cy="12" r="17.4" />}
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}

export default IconoSteam
