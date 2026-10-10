import { useState, useEffect } from 'react'
import { alCambiarServidorLento } from './api'
import { useIdioma } from './IdiomaContext'
import Mensaje from './Mensaje'

// Aviso flotante que sale cuando el servidor tarda en responder (ver api.js). En un
// hosting gratuito el servidor se duerme si nadie lo usa y la primera petición tarda
// hasta un minuto: sin este aviso la app parecería colgada. Entra y sale con la
// animación de Mensaje y desaparece solo cuando llega la respuesta.
function AvisoServidor() {
  const { t } = useIdioma()
  const [lento, setLento] = useState(false)

  useEffect(() => alCambiarServidorLento(setLento), [])

  return (
    <div className="aviso-servidor">
      <Mensaje tipo="aviso" texto={lento ? t('api.servidorLento') : ""} />
    </div>
  )
}

export default AvisoServidor
