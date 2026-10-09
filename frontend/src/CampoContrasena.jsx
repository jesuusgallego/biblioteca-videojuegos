import { useId, useState } from 'react'
import { useIdioma } from './IdiomaContext'

// Campo de contraseña con un botón (el ojo) para enseñar u ocultar lo escrito. Así
// se puede comprobar que se ha escrito bien, sobre todo la contraseña actual, que
// de otro modo es imposible de revisar.
//  - etiqueta: el texto del campo
//  - value / onChange: como en cualquier input controlado
//  - autoComplete: "current-password" o "new-password" (lo usan los gestores de claves)
//  - children: lo que va debajo del campo (ayudas, avisos...)
function CampoContrasena({ etiqueta, value, onChange, autoComplete, children }) {
  const { t } = useIdioma()
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>

      <div className="campo-contrasena">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        {/* aria-pressed: el lector de pantalla dice si está pulsado (contraseña
            visible). onMouseDown con preventDefault evita que, al pulsar el ojo, el
            campo pierda el foco y se pierda la posición del cursor. */}
        <button
          type="button"
          className="campo-contrasena__ojo"
          aria-pressed={visible}
          aria-label={visible ? t('password.ocultar') : t('password.mostrar')}
          title={visible ? t('password.ocultar') : t('password.mostrar')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle className="ojo__pupila" cx="12" cy="12" r="3" />
            {/* La raya solo se ve con la contraseña oculta: se dibuja con el truco
                del trazo (stroke-dashoffset) para que aparezca y desaparezca animada */}
            <path className={visible ? "ojo__raya" : "ojo__raya ojo__raya--visible"} d="M4 4l16 16" pathLength="1" />
          </svg>
        </button>
      </div>

      {children}
    </div>
  )
}

export default CampoContrasena
