/* Estado compartido y pantalla de exploración. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icono = id => `<svg><use href="#${id}"/></svg>`;

const Estado = {
  datos: { version: 1, mundos: [], personajes: [] },
  mundoId: null,
  personajeId: null,
  busqueda: "",
  busquedaMundo: "",
  vistaFavoritos: false,
  sucio: false,            // hay cambios sin publicar
  imagenesNuevas: [],      // [{ruta, base64}]
  rutasABorrar: [],
  previas: {},             // ruta -> blob URL, para ver la imagen antes de publicarla
  sinPublicar: new Set(),  // ids creados en esta sesión y aún no publicados
};

/* Una imagen recién soltada aún no existe en el repositorio: mientras tanto
   se muestra la previsualización local. */
const urlImagen = ruta => (ruta ? (Estado.previas[ruta] || ruta) : "");

/* ---------- avisos ---------- */
const Aviso = (() => {
  const caja = $("#avisos");
  function mostrar(titulo, texto = "", tipo = "ok", ms = 4200) {
    const el = document.createElement("div");
    el.className = `aviso ${tipo}`;
    const ic = tipo === "error" ? "i-alerta" : tipo === "trabajando" ? "i-rueda" : "i-check";
    el.innerHTML = `<svg class="${tipo === "trabajando" ? "girando" : ""}"><use href="#${ic}"/></svg>
      <div class="txt"><strong>${esc(titulo)}</strong>${texto ? `<span>${esc(texto)}</span>` : ""}</div>`;
    caja.appendChild(el);
    if (ms) setTimeout(() => el.remove(), ms);
    return { cerrar: () => el.remove(), actualizar: t => { el.querySelector("span").textContent = t; } };
  }
  return {
    ok: (t, s) => mostrar(t, s, "ok"),
    error: (t, s) => mostrar(t, s, "error", 8000),
    trabajando: (t, s) => mostrar(t, s, "trabajando", 0),
  };
})();

/* ---------- utilidades de datos ---------- */
const mundoPorId = id => Estado.datos.mundos.find(m => m.id === id);
const personajePorId = id => Estado.datos.personajes.find(p => p.id === id);
const personajesDe = id => Estado.datos.personajes.filter(p => p.mundo === id);
const estaCompleto = p => Boolean(p.descripcion && p.descripcion.trim());

/* Qué le falta a una ficha para estar entera. Sirve para el filtro de
   incompletos del panel y para explicar en el aviso qué hay que rellenar. */
const CAMPOS_REVISABLES = [
  { clave: "imagen", etiqueta: "retrato" },
  { clave: "descripcion", etiqueta: "descripción" },
  { clave: "etiquetas", etiqueta: "etiquetas" },
  { clave: "alias", etiqueta: "alias" },
  ...CAMPOS_FICHA.map(c => ({ clave: c.clave, etiqueta: c.etiqueta.toLowerCase() })),
];
function camposQueFaltan(p) {
  return CAMPOS_REVISABLES
    .filter(c => {
      const v = p[c.clave];
      return Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
    })
    .map(c => c.etiqueta);
}

/* El id acaba siendo el nombre del archivo de la imagen, así que conviene que
   se lea: «marvel-iron-man.webp» y no «nuevo-1786920255771.webp». */
function idLibre(base, existentes) {
  const limpio = base.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sin-nombre";
  let id = limpio, n = 2;
  while (existentes.includes(id)) id = `${limpio}-${n++}`;
  return id;
}

/* Sin mundo (por ejemplo al filtrar por «todos») el acento cae a neutro, igual
   que en la bienvenida: ningún universo tiene por qué teñir la pantalla. */
const ACENTO_NEUTRO = "#EDEDF4";
function aplicarAcento(mundo) {
  const r = document.documentElement.style;
  const color = mundo?.acento || ACENTO_NEUTRO;
  r.setProperty("--accent", color);
  r.setProperty("--accent-ink", mundo?.tinta || "#0B0B10");
  r.setProperty("--accent-soft", color + "24");
}

/* ---------- navegación entre pantallas ---------- */
const MIGAS = {
  bienvenida: "Archivo interdimensional de personajes",
  explorador: "Explorador",
  admin: "Modo editor",
};
function irA(id) {
  $$(".pantalla").forEach(s => s.classList.toggle("activa", s.id === id));
  $("#miga").textContent = MIGAS[id];
  if (id === "explorador" && Estado.mundoId) {
    $("#miga").textContent = `Explorador · ${mundoPorId(Estado.mundoId)?.nombre ?? ""}`;
  }
}

/* ---------- render: mundos ---------- */
/* Los mundos van alfabéticos: con una decena en la lista, buscar por orden de
   creación no lo encuentra nadie. */
const mundosOrdenados = () =>
  [...Estado.datos.mundos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

function pintarMundos() {
  const bf = $("#btnFavoritos");
  if (bf) {
    const n = Fav.cuantos();
    bf.classList.toggle("oculto", n === 0 && !Estado.vistaFavoritos);
    bf.classList.toggle("activo", Estado.vistaFavoritos);
    $("#cuentaFavoritos").textContent = n;
  }
  const nav = $("#listaMundos");
  nav.innerHTML = '<div class="label">Universos</div>';
  const q = Estado.busquedaMundo.trim().toLowerCase();
  const ordenados = mundosOrdenados().filter(m => !q || m.nombre.toLowerCase().includes(q));

  if (!ordenados.length) {
    nav.insertAdjacentHTML("beforeend",
      `<p style="padding:var(--s4) var(--s3);font-size:12.5px;color:var(--fg-faint)">Ningún mundo se llama así.</p>`);
    return;
  }

  for (const m of ordenados) {
    const b = document.createElement("button");
    b.className = "mundo" + (m.id === Estado.mundoId && !Estado.vistaFavoritos ? " activo" : "");
    const n = personajesDe(m.id).length;
    b.innerHTML = `<span class="punto" style="background:${esc(m.acento)}"></span>
      <span class="nm">${esc(m.nombre)}</span><span class="ct">${n || "—"}</span>`;
    b.onclick = () => elegirMundo(m.id);
    nav.appendChild(b);
  }
}

function elegirMundo(id) {
  Estado.vistaFavoritos = false;
  Estado.mundoId = id;
  Estado.personajeId = null;
  aplicarAcento(mundoPorId(id));
  pintarMundos();
  pintarRiel();
  // sólo si ya estamos en el explorador: al arrancar esto corría con la
  // bienvenida delante y le ponía el nombre del primer mundo.
  if ($("#explorador").classList.contains("activa")) {
    $("#miga").textContent = `Explorador · ${mundoPorId(id)?.nombre ?? ""}`;
  }
}

/* ---------- render: carrusel ---------- */
/* La búsqueda se queda dentro del mundo que se está mirando: el lateral ya
   sirve para cambiar de universo, así que sacar resultados de otros aquí
   confundía más que ayudaba. */
function listaVisible() {
  const q = Estado.busqueda.trim().toLowerCase();
  const delMundo = Estado.vistaFavoritos
    ? Estado.datos.personajes.filter(p => Fav.es(p.id))
    : personajesDe(Estado.mundoId);
  if (!q) return delMundo;
  return delMundo.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    (p.alias || "").toLowerCase().includes(q) ||
    (p.nombreReal || "").toLowerCase().includes(q));
}

function pintarRiel() {
  const riel = $("#riel");
  const lista = listaVisible();
  const buscando = Boolean(Estado.busqueda.trim());
  const mundo = mundoPorId(Estado.mundoId);

  $("#tituloMundo").textContent = Estado.vistaFavoritos ? "Mis favoritos" : (mundo?.nombre ?? "—");
  const total = Estado.vistaFavoritos ? Fav.cuantos() : personajesDe(Estado.mundoId).length;
  $("#cuentaMundo").textContent = !lista.length
    ? (buscando ? "— nada coincide" : "— sin personajes todavía")
    : buscando ? `— ${lista.length} de ${total}`
    : `— ${lista.length} ${lista.length === 1 ? "personaje" : "personajes"}`;

  riel.innerHTML = "";
  for (const p of lista) {
    const b = document.createElement("button");
    b.className = "ficha-card" + (p.id === Estado.personajeId ? " sel" : "");
    b.dataset.id = p.id;
    const src = urlImagen(p.imagen);
    const arte = src
      ? `<img src="${esc(src)}" alt="${esc(p.nombre)}" loading="lazy">`
      : `<svg><use href="#i-persona"/></svg>`;
    const sub = Estado.vistaFavoritos ? (mundoPorId(p.mundo)?.nombre ?? "") : (p.alias || "—");
    b.innerHTML = `${estaCompleto(p) ? "" : '<span class="marca-inc" title="Ficha sin completar"></span>'}
      ${Fav.es(p.id) ? `<span class="marca-fav" title="En tus favoritos">${icono("i-corazon")}</span>` : ""}
      <span class="arte">${arte}</span>
      <span class="placa"><span class="n">${esc(p.nombre)}</span><span class="r">${esc(sub)}</span></span>`;
    b.onclick = () => elegirPersonaje(p.id);
    riel.appendChild(b);
  }

  if (!buscando && !Estado.vistaFavoritos && GH.hayToken()) {
    const add = document.createElement("button");
    add.className = "ficha-card nueva";
    add.innerHTML = `${icono("i-mas")}<span>Añadir</span>`;
    add.onclick = () => Admin.nuevoPersonaje(Estado.mundoId);
    riel.appendChild(add);
  }

  if (lista.length && !lista.some(p => p.id === Estado.personajeId)) {
    elegirPersonaje(lista[0].id);
  } else {
    pintarDetalle();
  }
}

function elegirPersonaje(id) {
  Estado.personajeId = id;
  $$("#riel .ficha-card").forEach(c => c.classList.toggle("sel", c.dataset.id === id));
  $(`#riel .ficha-card[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  pintarDetalle();
}

/* ---------- render: ficha ---------- */
function pintarDetalle() {
  const cont = $("#detalle");
  const p = personajePorId(Estado.personajeId);

  if (!p) {
    const buscando = Boolean(Estado.busqueda.trim());
    cont.innerHTML = `<div class="vacio">
      ${icono(buscando ? "i-lupa" : "i-personas")}
      <h3>${buscando ? "Nada coincide en este mundo" : "Este mundo todavía está vacío"}</h3>
      <p>${buscando ? "Prueba con otro nombre, o cambia de mundo en el lateral." : "Entra en modo editor para añadir el primer personaje."}</p>
    </div>`;
    return;
  }

  const mundo = mundoPorId(p.mundo);
  const campos = CAMPOS_FICHA.filter(c => (p[c.clave] || "").trim());
  const origen = [mundo?.nombre, p.primeraAparicion, p.afiliacion].filter(Boolean).join(" · ");

  cont.innerHTML = `
    <div class="detalle-arte">
      ${urlImagen(p.imagen) ? `<img src="${esc(urlImagen(p.imagen))}" alt="${esc(p.nombre)}">` : `<svg><use href="#i-persona"/></svg>`}
    </div>
    <div class="detalle-cuerpo">
      <div class="detalle-titulo">
        <h2>${esc(p.nombre)}</h2>
        ${p.alias ? `<span class="alias">${esc(p.alias)}</span>` : ""}
        <button class="btn-corazon${Fav.es(p.id) ? " marcado" : ""}" id="btnFav"
                title="${Fav.es(p.id) ? "Quitar de favoritos" : "Guardar en favoritos"}"
                aria-pressed="${Fav.es(p.id)}">${icono("i-corazon")}</button>
      </div>
      <div class="origen">${esc(origen || mundo?.nombre || "")}</div>
      ${campos.length ? `<div class="campos">${campos.map(c =>
        `<div class="c"><div class="k">${esc(c.etiqueta)}</div><div class="v">${esc(p[c.clave])}</div></div>`).join("")}</div>` : ""}
      <div class="seccion-k">Descripción</div>
      ${p.descripcion?.trim()
        ? `<p class="bio">${esc(p.descripcion)}</p>`
        : `<p class="bio" style="color:var(--fg-faint);font-style:italic">Esta ficha aún no tiene descripción.${GH.hayToken() ? " Puedes escribirla desde el modo editor." : ""}</p>`}
      ${p.etiquetas?.length ? `<div class="seccion-k">Etiquetas</div>
        <div class="etiquetas">${p.etiquetas.map(t => `<span class="etiqueta">${esc(t)}</span>`).join("")}</div>` : ""}
    </div>`;

  $("#btnFav").onclick = () => Fav.alternar(p.id);
}

/* ---------- teclado ---------- */
document.addEventListener("keydown", e => {
  if (!$("#explorador").classList.contains("activa")) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const lista = listaVisible();
  const i = lista.findIndex(p => p.id === Estado.personajeId);
  if (i < 0) return;
  const sig = e.key === "ArrowRight" ? Math.min(i + 1, lista.length - 1) : Math.max(i - 1, 0);
  if (sig !== i) { elegirPersonaje(lista[sig].id); e.preventDefault(); }
});

/* ---------- búsqueda ---------- */
$("#buscar").addEventListener("input", e => {
  Estado.busqueda = e.target.value;
  $("#cajaBuscar").classList.toggle("con-texto", Boolean(Estado.busqueda));
  Estado.personajeId = null;
  pintarRiel();
});
$("#buscarMundo").addEventListener("input", e => {
  Estado.busquedaMundo = e.target.value;
  $("#cajaBuscarMundo").classList.toggle("con-texto", Boolean(Estado.busquedaMundo));
  pintarMundos();
});
$("#limpiarBuscarMundo").onclick = () => {
  $("#buscarMundo").value = ""; Estado.busquedaMundo = "";
  $("#cajaBuscarMundo").classList.remove("con-texto");
  pintarMundos(); $("#buscarMundo").focus();
};

$("#limpiarBuscar").onclick = () => {
  $("#buscar").value = ""; Estado.busqueda = "";
  $("#cajaBuscar").classList.remove("con-texto");
  Estado.personajeId = null; pintarRiel(); $("#buscar").focus();
};

/* ---------- modales ---------- */
$$("[data-cerrar-modal]").forEach(b => b.onclick = () => b.closest(".velo").classList.remove("abierto"));
$$(".velo").forEach(v => v.addEventListener("click", e => { if (e.target === v) v.classList.remove("abierto"); }));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") $$(".velo.abierto").forEach(v => v.classList.remove("abierto"));
});


/* ---------- favoritos y cuenta ---------- */
$("#btnFavoritos").onclick = () => {
  Estado.vistaFavoritos = !Estado.vistaFavoritos;
  Estado.personajeId = null;
  if (!Estado.vistaFavoritos && !Estado.mundoId) Estado.mundoId = mundosOrdenados()[0]?.id;
  aplicarAcento(Estado.vistaFavoritos ? null : mundoPorId(Estado.mundoId));
  $("#miga").textContent = Estado.vistaFavoritos ? "Explorador · Mis favoritos"
    : `Explorador · ${mundoPorId(Estado.mundoId)?.nombre ?? ""}`;
  pintarMundos(); pintarRiel();
};

/* El modal hace de registro y de acceso; cambia de modo sin recargar nada. */
let modoRegistro = false;
function abrirCuenta() {
  if (Fav.hayCuenta()) {
    if (confirm(`Sesión de ${Fav.quien().email}. ¿Cerrarla?`)) {
      Fav.salir().then(() => Aviso.ok("Sesión cerrada", "Tus favoritos vuelven a guardarse solo en este navegador."));
    }
    return;
  }
  modoRegistro = false; pintarModoCuenta();
  $("#errorCuenta").classList.add("oculto");
  $("#modalCuenta").classList.add("abierto");
  setTimeout(() => $("#correo").focus(), 60);
}
function pintarModoCuenta() {
  $("#tituloCuenta").textContent = modoRegistro ? "Crear una cuenta" : "Entrar en tu cuenta";
  $("#btnEntrarCuenta").textContent = modoRegistro ? "Registrarme" : "Entrar";
  $("#textoCambiar").textContent = modoRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
  $("#btnCambiarModo").textContent = modoRegistro ? "Entra" : "Regístrate";
  $("#clave").autocomplete = modoRegistro ? "new-password" : "current-password";
}
$("#btnCuenta").onclick = abrirCuenta;
$("#btnCambiarModo").onclick = () => { modoRegistro = !modoRegistro; pintarModoCuenta(); };

$("#btnEntrarCuenta").onclick = async () => {
  const correo = $("#correo").value.trim(), clave = $("#clave").value;
  const err = $("#errorCuenta"), btn = $("#btnEntrarCuenta");
  const fallar = t => { err.querySelector("span").textContent = t; err.classList.remove("oculto"); };
  if (!correo || !clave) return fallar("Rellena el correo y la contraseña.");

  btn.disabled = true; const antes = btn.textContent; btn.textContent = "Un momento…";
  try {
    const u = modoRegistro ? await Fav.registrar(correo, clave) : await Fav.entrar(correo, clave);
    $("#modalCuenta").classList.remove("abierto");
    $("#correo").value = ""; $("#clave").value = ""; err.classList.add("oculto");
    Aviso.ok(`Hola, ${u.email.split("@")[0]}`,
      Fav.cuantos() ? `Tienes ${Fav.cuantos()} favoritos guardados.` : "Marca personajes con el corazón.");
  } catch (e) {
    fallar(e.message);
  } finally {
    btn.disabled = false; btn.textContent = antes;
  }
};
$("#clave").addEventListener("keydown", e => { if (e.key === "Enter") $("#btnEntrarCuenta").click(); });

/* ---------- arranque ---------- */
async function arrancar() {
  try {
    Estado.datos = await GH.leerDatos();
  } catch {
    Aviso.error("No se pudo cargar el catálogo", "Revisa que datos.json esté publicado.");
    $("#estadoCarga").textContent = "Error al cargar";
    return;
  }

  const total = Estado.datos.personajes.length;
  $("#cifraMundos").textContent = Estado.datos.mundos.length;
  $("#cifraPersonajes").textContent = total;
  $("#cifraCompletos").textContent = Estado.datos.personajes.filter(estaCompleto).length;
  $("#estadoCarga").textContent = "Archivo cargado";
  $("#btnEntrar").disabled = false;

  // La lista va alfabética, pero se entra por el mundo con más contenido: abrir
  // en uno de dos personajes por empezar por D es una mala carta de presentación.
  const primero = [...Estado.datos.mundos]
    .sort((a, b) => personajesDe(b.id).length - personajesDe(a.id).length)[0];
  if (primero) elegirMundo(primero.id); else { pintarMundos(); pintarRiel(); }

  // admin.js declara Admin con const, así que no está en window: se comprueba por nombre.
  await Fav.iniciar();

  const u = await GH.reanudar();
  if (u && typeof Admin !== "undefined") Admin.marcarSesion(u);
}

$("#btnEntrar").onclick = () => irA("explorador");
arrancar();
