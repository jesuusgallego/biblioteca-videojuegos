// Compila la interfaz (frontend/) para la app de escritorio y la deja en desktop/app.
//
// Uso:
//   GAMEHUB_API_URL=https://api.tu-servidor.com npm run build:web
//   (en Windows PowerShell:  $env:GAMEHUB_API_URL="https://..." ; npm run build:web)
//
// GAMEHUB_API_URL es la dirección del servidor (backend) al que llamará la app. Se
// "graba" en el código al compilar: para cambiarla hay que volver a compilar.
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const frontend = join(aqui, '..', '..', 'frontend')
const salida = join(aqui, '..', 'app')

const apiUrl = process.env.GAMEHUB_API_URL
if (!apiUrl || !/^https?:\/\//.test(apiUrl)) {
  console.error('Falta GAMEHUB_API_URL (por ejemplo https://api.tu-servidor.com).')
  process.exit(1)
}
if (!apiUrl.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(apiUrl)) {
  console.error('GAMEHUB_API_URL debe ser https:// (http solo vale para localhost).')
  process.exit(1)
}

const resultado = spawnSync(
  process.execPath,
  [join(frontend, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', salida, '--emptyOutDir'],
  {
    cwd: frontend,
    stdio: 'inherit',
    env: { ...process.env, VITE_DESKTOP: '1', VITE_API_URL: apiUrl.replace(/\/+$/, '') },
  }
)
if (resultado.status !== 0) process.exit(resultado.status ?? 1)

// main.js lo lee para saber a qué servidor puede conectarse la ventana (CSP)
mkdirSync(salida, { recursive: true })
writeFileSync(join(salida, 'config.json'), JSON.stringify({ apiUrl }, null, 2))
console.log(`Interfaz compilada en ${salida} (API: ${apiUrl})`)
