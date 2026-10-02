import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Biblioteca from './Biblioteca'
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
        <Route
          path="/biblioteca"
          element={
            <RutaProtegida token={token}>
              <Biblioteca setToken={setToken} />
            </RutaProtegida>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App