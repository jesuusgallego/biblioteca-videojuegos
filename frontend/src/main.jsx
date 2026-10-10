import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tipografías del diseño, servidas desde la propia app (paquetes @fontsource) y no
// desde Google Fonts: así la app se ve igual sin conexión y no manda las visitas de los
// usuarios a un tercero. Solo los pesos que usa el CSS, y solo el alfabeto latino.
//  - Barlow Condensed: logo y títulos. Figtree: texto.
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/figtree/latin-400.css'
import '@fontsource/figtree/latin-500.css'
import '@fontsource/figtree/latin-600.css'
import '@fontsource/figtree/latin-700.css'
import './estilos/index.css'
import App from './App.jsx'
import ProveedorIdioma from './ProveedorIdioma'
import AvisoServidor from './AvisoServidor'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProveedorIdioma>
      <App />
      <AvisoServidor />
    </ProveedorIdioma>
  </StrictMode>,
)
