import { useIdioma } from './IdiomaContext'

// Icono minimalista (un documento con líneas) que avisa de que el juego tiene
// reseña. Lo uso junto al estado en las tarjetas de la biblioteca y en "Jugando
// ahora". No es un botón: el clic lo recoge la tarjeta entera y abre la ficha,
// donde se lee la reseña.
function IconoResena() {
  const { t } = useIdioma()

  return (
    <svg
      className="tarjeta__icono-resena"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={t('juego.tieneResena')}
    >
      <title>{t('juego.tieneResena')}</title>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  )
}

export default IconoResena
