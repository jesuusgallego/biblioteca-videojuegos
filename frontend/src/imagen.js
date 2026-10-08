// Reduce una foto elegida por el usuario a un cuadrado de `lado` píxeles y la
// devuelve como "data URL" (el propio texto de la imagen en base64:
// "data:image/jpeg;base64,/9j/4AAQ..."). Así la foto cabe en una columna de texto
// de la BD y no necesito servir ni guardar archivos.
//
// Una foto de móvil pesa varios MB; con 256 px y JPEG al 85 % se queda en
// ~20-40 KB, de sobra para un avatar. Lo hago aquí, en el navegador, para no
// enviar megas al servidor para nada.
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

  // Recorto el cuadrado central (como "object-fit: cover") para no deformarla
  const recorte = Math.min(imagen.width, imagen.height)
  const origenX = (imagen.width - recorte) / 2
  const origenY = (imagen.height - recorte) / 2

  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')

  // JPEG no tiene transparencia: sin este fondo blanco, las zonas transparentes
  // de un PNG saldrían negras
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, lado, lado)
  ctx.drawImage(imagen, origenX, origenY, recorte, recorte, 0, 0, lado, lado)
  imagen.close()

  return canvas.toDataURL('image/jpeg', 0.85)
}
