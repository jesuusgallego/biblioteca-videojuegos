// Funciones para preparar la foto de perfil. El resultado es siempre un "data URL"
// (el propio texto de la imagen en base64: "data:image/jpeg;base64,/9j/4AAQ...").
// Así la foto cabe en una columna de texto de la BD y no necesito servir ni
// guardar archivos.

// Recorta un cuadrado de `imagen` y lo reduce a `lado` píxeles.
//  - imagen: un <img> ya cargado o un ImageBitmap
//  - x, y: dónde está el recorte, de 0 a 1. Solo importa el eje en el que sobra
//    imagen: en una foto apaisada x mueve el cuadrado de izquierda a derecha; en
//    una vertical, y lo mueve de arriba a abajo. Con 0.5 es el centro.
// Una foto de móvil pesa varios MB; con 256 px y JPEG al 85 % se queda en
// ~20-40 KB, de sobra para un avatar. Lo hago aquí, en el navegador, para no
// enviar megas al servidor para nada.
export function cuadrarImagen(imagen, x = 0.5, y = 0.5, lado = 256) {
  // <img> guarda su tamaño en naturalWidth; ImageBitmap, en width
  const ancho = imagen.naturalWidth ?? imagen.width
  const alto = imagen.naturalHeight ?? imagen.height

  const recorte = Math.min(ancho, alto)
  const origenX = (ancho - recorte) * x
  const origenY = (alto - recorte) * y

  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')

  // JPEG no tiene transparencia: sin este fondo blanco, las zonas transparentes
  // de un PNG saldrían negras
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, lado, lado)
  ctx.drawImage(imagen, origenX, origenY, recorte, recorte, 0, 0, lado, lado)

  return canvas.toDataURL('image/jpeg', 0.85)
}

// Foto subida por el usuario: la recorta en el centro y la reduce
export async function reducirImagen(archivo, lado = 256) {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo elegido no es una imagen')
  }

  let imagen
  try {
    // createImageBitmap decodifica el archivo a una imagen que se puede dibujar
    imagen = await createImageBitmap(archivo)
  } catch {
    throw new Error('No se pudo leer la imagen. Prueba con un JPG, PNG o WebP')
  }

  const resultado = cuadrarImagen(imagen, 0.5, 0.5, lado)
  imagen.close()
  return resultado
}
