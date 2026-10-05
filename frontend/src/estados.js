// Los cuatro estados que puede tener un juego guardado y su texto en pantalla.
// Los usan JuegoGuardado (chip y desplegable de edición) y Biblioteca (filtros).
// La clave es el valor que guarda la base de datos en la columna "status".
export const ETIQUETAS_ESTADO = {
  jugando: "Jugando",
  completado: "Completado",
  abandonado: "Abandonado",
  pendiente: "Pendiente",
}
