// Pruebas del orden, los filtros y la búsqueda de Mi biblioteca (funciones puras).
// Se ejecutan con: npm test
import { test } from 'node:test'
import assert from 'node:assert'
import {
  CRITERIOS, TODOS, companiasDe, filtrar, filtrosVigentes, opcionesDeFiltros, ordenar,
} from '../src/ordenFiltros.js'

const juego = (name, extra = {}) => ({
  name, status: 'pendiente', platform: 'PC (Microsoft Windows)', created_at: '2026-01-01T00:00:00Z',
  genres: [], developers: [], publishers: [], ...extra,
})

const JUEGOS = [
  juego('The Legend of Zelda', { platform: 'Nintendo Switch', genres: ['Adventure'], developers: ['Nintendo R&D4'], publishers: ['Nintendo', 'Playtronic'] }),
  juego('Red Dead Redemption 2', { genres: ['Shooter', 'Adventure'], developers: ['Rockstar Games'], publishers: ['Rockstar Games', 'Take-Two Interactive'] }),
  juego('Pokémon Rojo', { platform: 'Game Boy', genres: ['Role-playing (RPG)'], developers: ['Game Freak'], publishers: ['Nintendo'] }),
  juego('Elden Ring', { genres: ['Role-playing (RPG)'], developers: ['FromSoftware'], publishers: ['Bandai Namco'] }),
  juego('Sin datos'),
]
const SIN_FILTROS = { estado: TODOS, genero: TODOS, compania: TODOS, plataforma: TODOS }
const buscar = (texto, filtros = SIN_FILTROS) => filtrar(JUEGOS, filtros, texto).map((j) => j.name)

test('buscar: nombre, compañía (desarrolladora o publisher), género y plataforma', () => {
  assert.deepStrictEqual(buscar('nintendo'), ['The Legend of Zelda', 'Pokémon Rojo'])
  assert.deepStrictEqual(buscar('take-two'), ['Red Dead Redemption 2'], 'publisher que no desarrolla')
  assert.deepStrictEqual(buscar('rpg'), ['Pokémon Rojo', 'Elden Ring'])
  assert.deepStrictEqual(buscar('game boy'), ['Pokémon Rojo'])
  assert.strictEqual(buscar('').length, JUEGOS.length)
})

test('buscar ignora mayúsculas, acentos y espacios de más', () => {
  assert.deepStrictEqual(buscar('pokemon'), ['Pokémon Rojo'])
  assert.deepStrictEqual(buscar('POKÉMON'), ['Pokémon Rojo'])
  assert.deepStrictEqual(buscar('  nintendo   rpg '), ['Pokémon Rojo'])
})

test('con varias palabras, todas deben aparecer en algún sitio del juego', () => {
  assert.deepStrictEqual(buscar('nintendo zelda'), ['The Legend of Zelda'])
  assert.deepStrictEqual(buscar('nintendo xbox'), [])
})

test('la búsqueda se combina con los filtros', () => {
  assert.deepStrictEqual(buscar('nintendo', { ...SIN_FILTROS, genero: 'Adventure' }), ['The Legend of Zelda'])
  assert.deepStrictEqual(buscar('', { ...SIN_FILTROS, compania: 'Nintendo' }), ['The Legend of Zelda', 'Pokémon Rojo'])
})

test('companiasDe junta desarrolladoras y publishers sin repetir', () => {
  assert.deepStrictEqual(companiasDe(JUEGOS[1]), ['Rockstar Games', 'Take-Two Interactive'])
})

test('opcionesDeFiltros cuenta cada valor una vez por juego y ordena', () => {
  const o = opcionesDeFiltros(JUEGOS, 'es-ES')
  assert.deepStrictEqual(o.genero.map((x) => [x.valor, x.cuenta]), [
    ['Adventure', 2], ['Role-playing (RPG)', 2], ['Shooter', 1],
  ])
  assert.ok(o.compania.some((x) => x.valor === 'Nintendo' && x.cuenta === 2))
})

test('filtrosVigentes vuelve a "todos" si el valor elegido ya no existe', () => {
  const o = opcionesDeFiltros(JUEGOS, 'es-ES')
  const v = filtrosVigentes({ ...SIN_FILTROS, genero: 'Puzzle', compania: 'Nintendo' }, o)
  assert.strictEqual(v.genero, TODOS)
  assert.strictEqual(v.compania, 'Nintendo')
})

test('ordenar: los que no tienen el dato van siempre al final', () => {
  const l = [
    juego('B', { playtime_minutes: 10 }),
    juego('Sin horas'),
    juego('A', { playtime_minutes: 500 }),
  ]
  assert.deepStrictEqual(ordenar(l, 'tiempo', 'desc', 'es-ES').map((j) => j.name), ['A', 'B', 'Sin horas'])
  assert.deepStrictEqual(ordenar(l, 'tiempo', 'asc', 'es-ES').map((j) => j.name), ['B', 'A', 'Sin horas'])
})

test('ordenar por nombre respeta los acentos del idioma', () => {
  const l = [juego('Zelda'), juego('Álvaro'), juego('Blasphemous')]
  assert.deepStrictEqual(ordenar(l, 'nombre', 'asc', 'es-ES').map((j) => j.name), ['Álvaro', 'Blasphemous', 'Zelda'])
})

test('ordenar por logros usa la proporción conseguida', () => {
  const l = [
    juego('Poco', { achievements_unlocked: 1, achievements_total: 100 }),
    juego('Todo', { achievements_unlocked: 10, achievements_total: 10 }),
    juego('Sin logros', { achievements_total: 0 }),
  ]
  assert.deepStrictEqual(ordenar(l, 'logros', 'desc', 'es-ES').map((j) => j.name), ['Todo', 'Poco', 'Sin logros'])
})

test('los criterios de orden no incluyen género ni compañía', () => {
  assert.deepStrictEqual(CRITERIOS.map((c) => c.id), ['anadido', 'nombre', 'tiempo', 'logros', 'nota', 'notaIgdb', 'lanzamiento'])
})
