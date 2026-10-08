// Foto de perfil redonda. Si el usuario no ha subido ninguna, pinto un círculo
// con el degradado de la marca y la inicial de su nombre.
//  - usuario: objeto con { username, avatar }; puede ser null mientras carga
//  - tamano: "pequeno" (barra), "normal" o "grande" (cabecera del perfil)
// El nombre no hace falta como alt: siempre aparece escrito al lado.
function Avatar({ usuario, tamano = "normal" }) {
  const inicial = usuario?.username?.trim().charAt(0).toUpperCase() ?? ""

  return (
    <span className={`avatar avatar--${tamano}`} aria-hidden="true">
      {usuario?.avatar ? <img src={usuario.avatar} alt="" /> : inicial}
    </span>
  )
}

export default Avatar
