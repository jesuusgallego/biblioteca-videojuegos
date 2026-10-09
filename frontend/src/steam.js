// ¿Este juego de la biblioteca viene de Steam? Es cierto tanto para los importados
// (imported_from = 'steam') como para los que ya estaban y la sincronización ha
// emparejado (steam_appid). Al desvincular la cuenta se les quita todo, y deja de
// serlo. Lo usan la insignia de las tarjetas y el icono de plataforma (para no
// poner dos veces el logo de Steam).
export function esDeSteam(juego) {
  return juego.steam_appid != null || juego.imported_from === 'steam'
}
