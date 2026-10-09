// Prepara la foto de perfil. El resultado es un "data URL" (el propio texto de la
// imagen en base64: "data:image/jpeg;base64,/9j/4AAQ..."), así que cabe en una
// columna de texto de la BD y no necesito servir ni guardar archivos.

// Color de relleno de las zonas donde la imagen no llega (si el usuario la reduce
// hasta que sobra espacio) y de las partes transparentes de un PNG. JPEG no tiene
// transparencia: sin un relleno saldrían negras. Es el mismo color que el fondo
// del recortador (RecortadorFoto), para que lo que se ve ahí sea lo que se guarda.
export const COLOR_RELLENO = '#0b121c'

// Recorta de `imagen` el cuadrado que empieza en (sx, sy) y mide `tamano`
// (los tres en píxeles de la imagen original) y lo reduce a `salida` píxeles.
//  - imagen: un <img> ya cargado
// El cuadrado puede salirse de la imagen: lo que queda fuera se rellena.
// Una foto de móvil pesa varios MB; con 256 px y JPEG al 85 % se queda en
// ~20-40 KB, de sobra para un avatar. Lo hago aquí, en el navegador, para no
// enviar megas al servidor para nada.
export function recortarImagen(imagen, sx, sy, tamano, salida = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = salida
  canvas.height = salida
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = COLOR_RELLENO
  ctx.fillRect(0, 0, salida, salida)

  // Dibujo la imagen entera, ya escalada y desplazada, en lugar de pedirle al
  // canvas que recorte un trozo: así no depende de cómo trate cada navegador un
  // recorte que se sale de la imagen.
  const factor = salida / tamano
  ctx.drawImage(imagen, -sx * factor, -sy * factor, imagen.naturalWidth * factor, imagen.naturalHeight * factor)

  return canvas.toDataURL('image/jpeg', 0.85)
}
