import { IconoMando } from './Marca'

// Indicador de carga: el mando del logo con su animación en bucle (la define
// el CSS, igual que el efecto al pasar el ratón por el logo).
//  - texto: si lo pongo, se lee con "role=status" y el destello recorre el texto;
//    sin texto es solo el icono (por ejemplo dentro de un botón que ya dice
//    "Guardando...").
//  - tamano: "pequeno" (dentro de botones), "normal" o "grande" (páginas enteras)
//  - centrado: lo centra en su contenedor, para cuando carga toda una zona
function Cargando({ texto, tamano = "normal", centrado = false }) {
  const clase = ["cargando", `cargando--${tamano}`, centrado && "cargando--centrado"]
    .filter(Boolean)
    .join(" ")

  return (
    <span className={clase} role={texto ? "status" : undefined} aria-hidden={texto ? undefined : true}>
      <IconoMando />
      {texto && <span className="cargando__texto">{texto}</span>}
    </span>
  )
}

export default Cargando
