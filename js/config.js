/* Configuración del repositorio.
   En GitHub Pages se deduce sola de la URL (usuario.github.io/repo/).
   Si la sirves desde otro sitio, rellena REPO_MANUAL a mano. */
const REPO_MANUAL = {
  propietario: "",   // ej. "mi-organizacion"
  repo: "",          // ej. "catalogo-interdimensional"
  rama: "main",
};

const CONFIG = (() => {
  if (REPO_MANUAL.propietario && REPO_MANUAL.repo) return { ...REPO_MANUAL };

  const host = location.hostname;                       // mi-org.github.io
  const seg = location.pathname.split("/").filter(Boolean);
  if (host.endsWith(".github.io")) {
    const propietario = host.replace(".github.io", "");
    // usuario.github.io/repo/  →  el repo es el primer segmento
    // usuario.github.io/       →  el repo se llama usuario.github.io
    const repo = seg.length ? seg[0] : host;
    return { propietario, repo, rama: "main" };
  }
  return { propietario: "", repo: "", rama: "main" };   // local: solo lectura
})();

CONFIG.configurado = Boolean(CONFIG.propietario && CONFIG.repo);
CONFIG.api = `https://api.github.com/repos/${CONFIG.propietario}/${CONFIG.repo}`;

/* Campos de la ficha. Añadir uno aquí lo añade al formulario y al detalle. */
const CAMPOS_FICHA = [
  { clave: "nombreReal",       etiqueta: "Nombre real" },
  { clave: "edad",             etiqueta: "Edad" },
  { clave: "nacimiento",       etiqueta: "Fecha de nacimiento" },
  { clave: "especie",          etiqueta: "Especie / Tipo" },
  { clave: "rol",              etiqueta: "Rol" },
  { clave: "afiliacion",       etiqueta: "Afiliación" },
  { clave: "primeraAparicion", etiqueta: "Primera aparición" },
  { clave: "estado",           etiqueta: "Estado" },
];

/* Supabase: cuentas y favoritos.
   La clave publicable va a la vista a propósito: es pública por diseño. Lo que
   protege los datos son las políticas de seguridad por fila de la tabla
   «favoritos», que impiden leer o tocar lo de otro usuario. */
const SUPABASE = {
  url: "https://bhtcmbfpgsoqhlzmgzwm.supabase.co",
  clave: "sb_publishable_stbMuUvirL2k-1NGJX8SHQ_kP-cSs7n",
};
