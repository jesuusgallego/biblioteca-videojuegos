import { useIdioma } from './IdiomaContext'
import Desplegable from './Desplegable'
import { CRITERIOS } from './ordenFiltros'

// Controles para ordenar Mi biblioteca: qué dato (nombre, tiempo jugado, género...)
// y en qué sentido. Es un componente "tonto": no guarda nada, Biblioteca.jsx es
// quien tiene el criterio y la dirección.
//  - criterio: id de uno de CRITERIOS
//  - direccion: 'asc' o 'desc'
//  - onCambiarCriterio(id) / onInvertir()
function OrdenBiblioteca({ criterio, direccion, onCambiarCriterio, onInvertir }) {
  const { t } = useIdioma()
  const opciones = CRITERIOS.map((c) => ({ valor: c.id, etiqueta: t(`orden.${c.id}`) }))
  // El texto del botón depende del tipo de dato: "A → Z" no tiene sentido en un tiempo
  const tipo = CRITERIOS.find((c) => c.id === criterio).tipo
  const sentido = t(`orden.${tipo}.${direccion}`)

  return (
    <div className="orden">
      <span className="orden__etiqueta">{t('orden.ordenarPor')}</span>

      <div className="orden__campo">
        <Desplegable
          opciones={opciones}
          valor={criterio}
          onChange={onCambiarCriterio}
          etiqueta={t('orden.ordenarPor')}
        />
      </div>

      <button
        type="button"
        className="btn btn--secundario orden__direccion"
        onClick={onInvertir}
        aria-label={`${t('orden.invertir')}: ${sentido}`}
        title={t('orden.invertir')}
      >
        {/* La flecha apunta arriba en ascendente y gira al invertir (ver biblioteca.css) */}
        <svg
          className={direccion === 'desc' ? "orden__flecha orden__flecha--desc" : "orden__flecha"}
          viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        {sentido}
      </button>
    </div>
  )
}

export default OrdenBiblioteca
