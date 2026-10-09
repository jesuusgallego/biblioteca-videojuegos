import { useIdioma } from './IdiomaContext'
import DialogoConfirmar from './DialogoConfirmar'
import EditarJuego from './EditarJuego'

// Las ventanas de "Editar" y "Quitar" de un juego guardado, según lo que diga el
// estado de useAccionesJuego. Son <dialog> modales, así que da igual dónde se
// pinten (dentro de una tarjeta o de la ficha): se abren encima de todo.
//  - juego: la fila del juego en mi biblioteca
//  - acciones: lo que devuelve useAccionesJuego
//  - onActualizar(cambios): función async que guarda los cambios; lanza un Error
//    si el backend falla (EditarJuego lo enseña en su ventana)
function VentanasJuego({ juego, acciones, onActualizar }) {
  const { t } = useIdioma()

  return (
    <>
      {acciones.editando && (
        <EditarJuego
          juego={juego}
          onActualizar={onActualizar}
          onCerrar={acciones.cerrarEdicion}
        />
      )}

      {acciones.confirmandoBorrar && (
        <DialogoConfirmar
          titulo={t('juego.quitarTitulo')}
          mensaje={t('juego.quitarMensaje', { nombre: juego.name })}
          textoConfirmar={t('juego.quitar')}
          onConfirmar={acciones.confirmarBorrado}
          onCancelar={acciones.cancelarBorrado}
        />
      )}
    </>
  )
}

export default VentanasJuego
