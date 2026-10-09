import { useState } from 'react'
import MenuContextual from './MenuContextual'
import { useIdioma } from './IdiomaContext'

// Iconos de las dos opciones (los mismos trazos que usa el resto de la app)
const IconoEditar = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

const IconoQuitar = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
)

// Menú del clic derecho de una tarjeta de juego guardado, con "Editar" y "Quitar".
// Hay que ponerle `onContextMenu={abrirMenu}` a la tarjeta y pintar `menu` en
// algún sitio (es null mientras está cerrado).
//  - juego: el juego de la tarjeta (para el nombre accesible)
//  - acciones: lo que devuelve useAccionesJuego; las opciones lo usan
//  - desactivado: true mientras la tarjeta está ocupada (por ejemplo, borrándose)
// Con Mayús + clic derecho se deja el menú del navegador, como es costumbre. Con el
// teclado (tecla de menú o Mayús + F10) llega un evento sin coordenadas: en ese
// caso lo coloco bajo el elemento que tiene el foco.
export function useMenuJuego(juego, acciones, desactivado = false) {
  const { t } = useIdioma()
  const [apertura, setApertura] = useState(null)

  function abrirMenu(e) {
    if (e.shiftKey || desactivado) return
    e.preventDefault()

    let { clientX: x, clientY: y } = e
    if (x === 0 && y === 0) {
      const r = e.target.getBoundingClientRect()
      x = r.left
      y = r.bottom
    }
    // timeStamp es distinto en cada evento: sirve de key para que un segundo clic
    // derecho cree un menú nuevo (ver MenuContextual)
    setApertura({ id: e.timeStamp, x, y })
  }

  const menu = apertura && (
    <MenuContextual
      key={apertura.id}
      x={apertura.x}
      y={apertura.y}
      etiqueta={t('juego.accionesDe', { nombre: juego.name })}
      opciones={[
        { id: 'editar', etiqueta: t('juego.editar'), icono: IconoEditar, onElegir: acciones.editar },
        { id: 'quitar', etiqueta: t('juego.quitar'), icono: IconoQuitar, peligro: true, onElegir: acciones.quitar },
      ]}
      onCerrar={() => setApertura(null)}
    />
  )

  return { abrirMenu, menu }
}
