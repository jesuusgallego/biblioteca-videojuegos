import { useState, useEffect, useRef } from 'react'
import { cuadrarImagen } from './imagen'
import Mensaje from './Mensaje'

// Lo que dura la animación de salida de una vista (debe coincidir con
// "vista-salida" en App.css)
const DURACION_VISTA_MS = 160

// Elegir una ilustración oficial (artwork) de IGDB como foto de perfil.
//  - juegos: [{ igdb_id, name, artworks: [{ thumb_url, url }] }] (GET /games/artworks)
//  - onUsar(dataUrl): recibe la foto ya recortada y reducida
// Primero se elige la ilustración en una lista agrupada por juego y luego se
// ajusta el encuadre, porque las ilustraciones son apaisadas y el avatar es un
// cuadrado: el recorte del centro no siempre es el que queda bien.
// Entre las dos vistas la que sale se desvanece y después entra la otra.
function SelectorArtwork({ juegos, onUsar }) {
  // null = se ve la lista; con una ilustración = se ve su encuadre
  const [elegida, setElegida] = useState(null)
  const [saliendo, setSaliendo] = useState(false)
  const temporizadorRef = useRef(null)

  // Si me quitan mientras hay un cambio a medias, lo cancelo
  useEffect(() => () => clearTimeout(temporizadorRef.current), [])

  function cambiarA(siguiente) {
    if (saliendo) return
    setSaliendo(true)

    // Con "reducir movimiento" el CSS quita las animaciones: no hay nada que esperar
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    temporizadorRef.current = setTimeout(() => {
      setElegida(siguiente)
      setSaliendo(false)
    }, sinMovimiento ? 0 : DURACION_VISTA_MS)
  }

  const clase = saliendo ? "vista vista--saliendo" : "vista"

  if (elegida) {
    // key: cada ilustración empieza con su propio estado (encuadre al centro)
    return (
      <div className={clase}>
        <Encuadre key={elegida.url} artwork={elegida} onUsar={onUsar} onVolver={() => cambiarA(null)} />
      </div>
    )
  }

  return (
    <div className={clase}>
      <div className="selector-artwork">
        {juegos.map((juego) => (
          <section key={juego.igdb_id}>
            <h3 className="selector-artwork__juego">{juego.name}</h3>
            <ul className="selector-artwork__fila">
              {juego.artworks.map((artwork, i) => (
                // --i es la posición de la miniatura: el CSS la usa para que
                // aparezcan una detrás de otra
                <li key={artwork.url} style={{ '--i': i }}>
                  <Miniatura
                    artwork={artwork}
                    etiqueta={`Ilustración ${i + 1} de ${juego.name}`}
                    onElegir={() => cambiarA(artwork)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

// Miniatura pulsable. Mientras llega la imagen se ve un fondo que late
// (esqueleto) y al llegar aparece con un fundido.
function Miniatura({ artwork, etiqueta, onElegir }) {
  const [cargada, setCargada] = useState(false)

  return (
    <button
      type="button"
      className={cargada ? "selector-artwork__imagen" : "selector-artwork__imagen selector-artwork__imagen--cargando"}
      aria-label={etiqueta}
      onClick={onElegir}
    >
      <img
        src={artwork.thumb_url}
        alt=""
        loading="lazy"
        onLoad={() => setCargada(true)}
        onError={() => setCargada(true)} // si falla no dejo el esqueleto latiendo para siempre
      />
    </button>
  )
}

function Encuadre({ artwork, onUsar, onVolver }) {
  // El <img> de la vista previa una vez cargado: de él leo el tamaño real y lo
  // dibujo en el canvas al recortar (así la imagen se descarga una sola vez)
  const [imagen, setImagen] = useState(null)
  const [posicion, setPosicion] = useState(50) // 0-100 a lo largo del eje que sobra
  const [error, setError] = useState("")

  const apaisada = !imagen || imagen.naturalWidth >= imagen.naturalHeight
  // object-position hace en la vista previa lo mismo que x/y en cuadrarImagen
  const objectPosition = apaisada ? `${posicion}% 50%` : `50% ${posicion}%`

  function usar() {
    const p = posicion / 100
    try {
      onUsar(apaisada ? cuadrarImagen(imagen, p, 0.5) : cuadrarImagen(imagen, 0.5, p))
    } catch {
      setError("No se pudo preparar la imagen. Prueba con otra")
    }
  }

  return (
    <div className="encuadre">
      <span className={imagen ? "encuadre__vista encuadre__vista--lista" : "encuadre__vista"}>
        {/* crossOrigin: IGDB permite leer sus imágenes desde otra web, pero hay que
            pedirlas así; si no, el canvas queda "contaminado" y no deja exportar */}
        <img
          src={artwork.url}
          alt=""
          crossOrigin="anonymous"
          style={{ objectPosition }}
          onLoad={(e) => setImagen(e.currentTarget)}
          onError={() => setError("No se pudo cargar la ilustración")}
        />
      </span>

      <div className="encuadre__controles">
        <label className="campo">
          <span>Encuadre</span>
          <input
            type="range"
            min="0"
            max="100"
            value={posicion}
            onChange={(e) => setPosicion(Number(e.target.value))}
            disabled={!imagen}
          />
          <small>Mueve el deslizador para elegir qué parte de la ilustración se ve en el círculo.</small>
        </label>

        <Mensaje texto={error} />

        <div className="formulario__acciones">
          <button type="button" className="btn btn--secundario" onClick={onVolver}>Volver</button>
          <button type="button" className="btn btn--primario" onClick={usar} disabled={!imagen}>
            Usar como foto
          </button>
        </div>
      </div>
    </div>
  )
}

export default SelectorArtwork
