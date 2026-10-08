import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Biblioteca from './Biblioteca'
import Buscar from './Buscar'
import Layout from './Layout'
import RutaProtegida from './RutaProtegida'
import './App.css'
import Registro from './Registro'

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "")

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/registro" element={<Registro />} />
        {/* Ruta "layout" (sin path): protege y envuelve a sus hijas con la barra */}
        <Route
          element={
            <RutaProtegida token={token}>
              <Layout setToken={setToken} />
            </RutaProtegida>
          }
        >
          <Route path="/biblioteca" element={<Biblioteca setToken={setToken} />} />
          <Route path="/buscar" element={<Buscar setToken={setToken} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App