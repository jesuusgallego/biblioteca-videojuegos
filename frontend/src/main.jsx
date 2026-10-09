import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ProveedorIdioma from './ProveedorIdioma'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProveedorIdioma>
      <App />
    </ProveedorIdioma>
  </StrictMode>,
)
