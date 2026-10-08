// Los cuatro estados de un juego guardado y su texto en pantalla. Los uso en
// JuegoGuardado (chip y desplegable de edición) y en Biblioteca (filtros).
// La clave es el valor que guarda la BD en la columna "status".
export const ETIQUETAS_ESTADO = {
  jugando: "Jugando",
  completado: "Completado",
  abandonado: "Abandonado",
  pendiente: "Pendiente",
}
