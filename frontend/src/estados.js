// Los cuatro estados de un juego guardado. Los uso en JuegoGuardado (chip y
// desplegable de edición), Biblioteca (filtros) y las estadísticas.
// Cada valor es el que guarda la BD en la columna "status". Su texto en pantalla
// está en textos/es.js y en.js, con la clave "estado.<valor>":
//   t(`estado.${estado}`)
export const ESTADOS = ['jugando', 'completado', 'abandonado', 'pendiente']
