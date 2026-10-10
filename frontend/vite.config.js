/* global process -- este archivo lo ejecuta Node al compilar, no el navegador */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Web: los archivos se sirven desde la raíz del servidor ("/assets/..."). Escritorio
  // (VITE_DESKTOP=1): se abren desde una carpeta del disco, así que las rutas tienen que
  // ser relativas ("./assets/...").
  base: process.env.VITE_DESKTOP ? './' : '/',
})
