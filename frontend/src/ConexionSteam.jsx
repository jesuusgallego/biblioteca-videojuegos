import { useEffect, useRef } from 'react'
import { IconoMando } from './Marca'
import IconoSteam from './IconoSteam'
import { useIdioma } from './IdiomaContext'

// Chispas que salen al conectarse: ángulo, distancia y color de cada una
const CHISPAS = Array.from({ length: 14 }, (_, i) => ({
  angulo: i * (360 / 14),
  distancia: i % 2 === 0 ? 3.6 : 5,
  color: ['var(--acento)', 'var(--exito)', '#fbbf24', '#a78bfa'][i % 4],
}))

// Escena que tapa el formulario mientras se vincula la cuenta de Steam: el logo de
// la app y el de Steam, unidos por una línea por la que viajan paquetes de datos.
//  - conectado false: está llamando al backend; los paquetes viajan en bucle
//  - conectado true: ya está vinculada; la línea se rellena, aparece el tic, salen
//    las chispas y el logo de Steam se convierte en la foto de la cuenta
//  - onTerminada(): se llama cuando acaba la última animación (el mensaje final).
//    No uso ningún temporizador: la escena avisa con el evento animationend, así
//    siempre dura lo que dura el CSS.
//  - saliendo: lo pone el padre (usePresencia) para animar su salida si falla
function ConexionSteam({ conectado, nombre, avatar, saliendo, onTerminada }) {
  const { t } = useIdioma()
  const terminadaRef = useRef(false)

  function terminar() {
    // Una sola vez: así un evento repetido no vincula dos veces la vista
    if (terminadaRef.current) return
    terminadaRef.current = true
    onTerminada()
  }

  // Con "reducir movimiento" el CSS quita las animaciones y animationend no llega
  // nunca: en ese caso termino en cuanto está conectada
  useEffect(() => {
    if (conectado && window.matchMedia('(prefers-reduced-motion: reduce)').matches) terminar()
  })

  const clases = [
    "conexion",
    conectado && "conexion--conectado",
    saliendo && "conexion--saliendo",
  ].filter(Boolean).join(" ")

  return (
    <div className={clases} role="status">
      <div className="conexion__escena" aria-hidden="true">
        <span className="conexion__nodo">
          <IconoMando />
        </span>

        <span className="conexion__camino">
          <span className="conexion__linea" />
          <span className="conexion__linea-llena" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="conexion__paquete" style={{ '--retraso': `${i * 0.45}s` }} />
          ))}
          <span className="conexion__marca">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7" />
            </svg>
          </span>
          {CHISPAS.map((c, i) => (
            <span
              key={i}
              className="conexion__chispa"
              style={{ '--ang': `${c.angulo}deg`, '--dist': `${c.distancia}rem`, '--c': c.color }}
            />
          ))}
        </span>

        <span className="conexion__nodo conexion__nodo--steam">
          <span className="conexion__logo"><IconoSteam tamano={38} /></span>
          {avatar && <img className="conexion__avatar" src={avatar} alt="" />}
        </span>
      </div>

      {conectado
        ? (
          <p
            className="conexion__texto conexion__texto--final"
            onAnimationEnd={(e) => { if (e.animationName === 'conexion-final') terminar() }}
          >
            <strong>{t('steam.conectado')}</strong>
            {nombre && <span>{t('steam.conectadoComo', { nombre })}</span>}
          </p>
        )
        : <p className="conexion__texto conexion__texto--busca">{t('steam.conectando')}</p>}
    </div>
  )
}

export default ConexionSteam
