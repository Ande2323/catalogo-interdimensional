/* Modo editor: alta, edición y borrado de mundos y personajes,
   y publicación en GitHub como un único commit. */
const Admin = (() => {
  let vista = "personajes";
  let seleccion = null;
  let filtro = "";
  let mundoFiltro = null;   // null = todos los mundos
  let soloIncompletos = false;

  /* ---------- sesión ---------- */
  function marcarSesion(u) {
    $("#sesion").classList.remove("oculto");
    $("#sesionNombre").textContent = u.login;
    $("#btnEditar").querySelector("span").textContent = "Panel de edición";
    pintarRiel();
  }

  $$("[data-abrir-sesion]").forEach(b => b.onclick = () => {
    if (GH.hayToken()) return abrirAdmin();
    if (!CONFIG.configurado) {
      return Aviso.error("Edición no disponible aquí",
        "Estás viendo una copia local. El modo editor solo funciona en la web publicada en GitHub Pages.");
    }
    $("#modalSesion").classList.add("abierto");
    setTimeout(() => $("#token").focus(), 60);
  });

  $("#btnValidarToken").onclick = async () => {
    const campo = $("#token"), err = $("#errorToken"), btn = $("#btnValidarToken");
    if (!campo.value.trim()) return mostrarError(err, campo, "Pega aquí tu token.");
    btn.disabled = true; btn.textContent = "Comprobando…";
    try {
      const u = await GH.entrar(campo.value);
      $("#modalSesion").classList.remove("abierto");
      campo.value = ""; err.classList.add("oculto"); campo.removeAttribute("aria-invalid");
      marcarSesion(u);
      Aviso.ok(`Hola, ${u.login}`, "Ya puedes editar el catálogo.");
      abrirAdmin();
    } catch (e) {
      mostrarError(err, campo, e.message);
    } finally {
      btn.disabled = false; btn.textContent = "Entrar";
    }
  };
  $("#token").addEventListener("keydown", e => { if (e.key === "Enter") $("#btnValidarToken").click(); });

  function mostrarError(caja, campo, texto) {
    caja.querySelector("span").textContent = texto;
    caja.classList.remove("oculto");
    campo.setAttribute("aria-invalid", "true");
  }

  $("#btnSalirAdmin").onclick = () => {
    if (Estado.sucio && !confirm("Tienes cambios sin publicar. Si sales ahora se pierden. ¿Seguro?")) return;
    GH.salir();
    Estado.sucio = false; Estado.imagenesNuevas = []; Estado.rutasABorrar = [];
    $("#sesion").classList.add("oculto");
    $("#btnEditar").querySelector("span").textContent = "Modo editor";
    location.reload();
  };

  /* ---------- panel ---------- */
  function abrirAdmin() {
    // se entra directamente al mundo que se estaba viendo, no a la lista entera
    if (mundoFiltro === null && Estado.mundoId) mundoFiltro = Estado.mundoId;
    irA("admin");
    pintarPanel();
  }

  $$(".anav[data-vista]").forEach(b => b.onclick = () => {
    vista = b.dataset.vista;
    seleccion = null; filtro = ""; $("#filtroAdmin").value = "";
    $$(".anav[data-vista]").forEach(x => x.classList.toggle("activo", x === b));
    pintarPanel();
  });

  $("#filtroAdmin").addEventListener("input", e => { filtro = e.target.value.toLowerCase(); pintarLista(); });

  $("#selectorMundo").addEventListener("change", e => {
    mundoFiltro = e.target.value || null;
    seleccion = null;
    pintarPanel();
  });

  $("#btnIncompletos").onclick = () => {
    soloIncompletos = !soloIncompletos;
    seleccion = null;
    pintarPanel();
  };
  $("#btnNuevo").onclick = () => (vista === "personajes" ? nuevoPersonaje(Estado.mundoId) : nuevoMundo());

  /* El panel se tiñe del mundo sobre el que se está trabajando, no del que
     quedó abierto en el explorador. En «todos los mundos» va neutro. */
  function acentoDelPanel() {
    if (vista === "mundos") {
      aplicarAcento(seleccion ? mundoPorId(seleccion) : null);
    } else {
      aplicarAcento(mundoFiltro ? mundoPorId(mundoFiltro) : null);
    }
  }

  function pintarPanel() {
    acentoDelPanel();
    $("#adminTitulo").textContent = vista === "personajes" ? "Personajes" : "Mundos";
    $("#btnNuevo").querySelector("span").textContent = vista === "personajes" ? "Nuevo personaje" : "Nuevo mundo";
    const av = $("#pendientes");
    const inc = personajesFiltrados({ soloMundo: true }).filter(p => !estaCompleto(p)).length;
    av.classList.toggle("oculto", vista !== "personajes" || inc === 0);
    if (inc) av.querySelector("span").textContent = `${inc} sin descripción`;
    pintarSelectorMundo();
    pintarLista();
    pintarFormulario();
  }

  /* La lista del editor se parte por mundos: con cien personajes de un solo
     universo, verlos todos juntos no hay quien lo maneje. Va en desplegable y
     no en fila de fichas, porque con muchos mundos aquello no cabía. */
  function pintarSelectorMundo() {
    const caja = $("#filaFiltros");
    caja.classList.toggle("oculto", vista !== "personajes");
    if (vista !== "personajes") return;

    const sel = $("#selectorMundo");
    const mundos = mundosOrdenados();
    sel.innerHTML =
      `<option value="">Todos los mundos (${Estado.datos.personajes.length})</option>` +
      mundos.map(m =>
        `<option value="${esc(m.id)}"${m.id === mundoFiltro ? " selected" : ""}>${esc(m.nombre)} (${personajesDe(m.id).length})</option>`
      ).join("");

    const inc = personajesFiltrados({ soloMundo: true, ignorarIncompletos: true })
      .filter(p => camposQueFaltan(p).length).length;
    const btn = $("#btnIncompletos");
    btn.setAttribute("aria-pressed", String(soloIncompletos));
    btn.querySelector("span").innerHTML = `Incompletas <span class="n">${inc}</span>`;
    btn.disabled = inc === 0 && !soloIncompletos;
  }

  function personajesFiltrados({ soloMundo = false, ignorarIncompletos = false } = {}) {
    return Estado.datos.personajes
      .filter(p => !mundoFiltro || p.mundo === mundoFiltro)
      .filter(p => ignorarIncompletos || !soloIncompletos || camposQueFaltan(p).length)
      .filter(p => soloMundo || !filtro || p.nombre.toLowerCase().includes(filtro));
  }

  function pintarLista() {
    const cont = $("#filasAdmin");
    cont.innerHTML = "";
    const items = vista === "personajes"
      ? personajesFiltrados().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      : mundosOrdenados().filter(m => !filtro || m.nombre.toLowerCase().includes(filtro));

    if (!items.length) {
      const mundo = mundoFiltro ? mundoPorId(mundoFiltro)?.nombre : null;
      const texto = filtro ? "Nada coincide con el filtro."
        : soloIncompletos ? (mundo ? `Todas las fichas de «${esc(mundo)}» están completas.`
                                   : "No queda ninguna ficha incompleta.")
        : mundo ? `«${esc(mundo)}» todavía no tiene personajes.`
        : "Todavía no hay nada aquí.";
      cont.innerHTML = `<div class="vacio" style="padding:var(--s6) var(--s4)">
        ${icono(soloIncompletos && !filtro ? "i-check" : "i-lupa")}<p>${texto}</p></div>`;
      return;
    }

    for (const it of items) {
      const b = document.createElement("button");
      b.className = "fila" + (it.id === seleccion ? " activa" : "");
      if (vista === "personajes") {
        const src = urlImagen(it.imagen);
        b.innerHTML = `<span class="mini">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : icono("i-persona")}</span>
          <span class="t"><span class="n">${esc(it.nombre)}</span>
          <span class="s">${esc(mundoPorId(it.mundo)?.nombre ?? "sin mundo")}</span></span>
          ${(() => { const f = camposQueFaltan(it);
             return f.length ? `<span class="falta" title="Falta: ${esc(f.join(", "))}"></span>` : ""; })()}`;
      } else {
        const n = personajesDe(it.id).length;
        b.innerHTML = `<span class="mini" style="background:${esc(it.acento)};border-radius:5px"></span>
          <span class="t"><span class="n">${esc(it.nombre)}</span>
          <span class="s">${n} ${n === 1 ? "personaje" : "personajes"}</span></span>`;
      }
      b.onclick = () => { seleccion = it.id; acentoDelPanel(); pintarLista(); pintarFormulario(); };
      cont.appendChild(b);
    }
  }

  /* ---------- formularios ---------- */
  function pintarFormulario() {
    const cont = $("#formAdmin");
    if (!seleccion) {
      cont.innerHTML = `<div class="vacio" style="height:100%">
        ${icono(vista === "personajes" ? "i-personas" : "i-globo")}
        <h3>Nada seleccionado</h3>
        <p>Elige algo de la lista para editarlo, o crea ${vista === "personajes" ? "un personaje" : "un mundo"} nuevo.</p>
        <button class="btn btn-primario btn-sm" onclick="document.getElementById('btnNuevo').click()">
          ${icono("i-mas")} Crear ${vista === "personajes" ? "personaje" : "mundo"}</button></div>`;
      return;
    }
    vista === "personajes" ? formPersonaje(cont) : formMundo(cont);
  }

  function formPersonaje(cont) {
    const p = personajePorId(seleccion);
    if (!p) { seleccion = null; return pintarFormulario(); }
    const src = urlImagen(p.imagen);
    const opciones = Estado.datos.mundos.map(m =>
      `<option value="${esc(m.id)}"${m.id === p.mundo ? " selected" : ""}>${esc(m.nombre)}</option>`).join("");

    cont.innerHTML = `
      <div class="form-rejilla">
        <div>
          <label class="label" style="display:block;margin-bottom:9px">Retrato</label>
          <div class="soltar" id="zonaSoltar" tabindex="0" role="button" aria-label="Subir retrato">
            ${src ? `<img src="${esc(src)}" alt="">`
                  : `${icono("i-subir")}<span class="t">Arrastra una imagen</span><span class="h">o haz clic para elegirla</span>`}
          </div>
          <input type="file" id="archivoImg" accept="image/*" hidden>
          <p class="ayuda" style="margin-top:9px">PNG con fondo transparente va mejor. Se convierte sola a WebP 600×800 antes de subirla.</p>
          ${src ? `<button class="btn btn-fantasma btn-sm" id="quitarImg" style="margin-top:10px;width:100%">Quitar retrato</button>` : ""}
        </div>
        <div class="campos-form">
          <div class="campo"><label for="c-nombre">Nombre visible *</label>
            <input id="c-nombre" data-campo="nombre" value="${esc(p.nombre)}">
            <div class="error oculto"><svg><use href="#i-alerta"/></svg><span></span></div></div>
          <div class="campo"><label for="c-mundo">Mundo *</label>
            <select id="c-mundo" data-campo="mundo">${opciones}</select></div>
          <div class="campo"><label for="c-alias">Alias / Título</label>
            <input id="c-alias" data-campo="alias" value="${esc(p.alias)}" placeholder="El Vengador Dorado"></div>
          ${CAMPOS_FICHA.map(c => `
          <div class="campo"><label for="c-${c.clave}">${esc(c.etiqueta)}</label>
            <input id="c-${c.clave}" data-campo="${c.clave}" value="${esc(p[c.clave] ?? "")}"></div>`).join("")}
          <div class="campo ancho"><label for="c-descripcion">Descripción</label>
            <textarea id="c-descripcion" data-campo="descripcion" placeholder="Quién es, de dónde sale, qué papel juega…">${esc(p.descripcion)}</textarea></div>
          <div class="campo ancho"><label for="c-etiquetas">Etiquetas</label>
            <input id="c-etiquetas" data-campo="etiquetas" value="${esc((p.etiquetas || []).join(", "))}" placeholder="Héroe, Mutante, Fundador">
            <div class="ayuda">Separadas por comas.</div></div>
        </div>
      </div>
      <div class="barra-guardar">
        <button class="btn btn-peligro btn-sm" id="btnBorrar">${icono("i-basura")} Borrar personaje</button>
        <span class="estado" id="estadoForm"></span>
      </div>`;

    conectarCampos(p);
    conectarImagen(p);
    $("#btnBorrar").onclick = () => pedirBorradoPersonaje(p);
  }

  function formMundo(cont) {
    const m = mundoPorId(seleccion);
    if (!m) { seleccion = null; return pintarFormulario(); }
    const n = personajesDe(m.id).length;

    cont.innerHTML = `
      <div class="campos-form" style="max-width:620px">
        <div class="campo ancho"><label for="c-nombre">Nombre del mundo *</label>
          <input id="c-nombre" data-campo="nombre" value="${esc(m.nombre)}">
          <div class="error oculto"><svg><use href="#i-alerta"/></svg><span></span></div></div>
        <div class="campo"><label for="c-acento">Color del mundo</label>
          <div class="campo-color">
            <input type="color" id="c-acento" data-campo="acento" value="${esc(m.acento)}">
            <input id="c-acento-hex" value="${esc(m.acento)}" spellcheck="false">
          </div>
          <div class="ayuda">Tiñe toda la interfaz cuando este mundo está activo.</div></div>
        <div class="campo"><label for="c-tinta">Texto sobre ese color</label>
          <select id="c-tinta" data-campo="tinta">
            <option value="#0B0B10"${m.tinta === "#0B0B10" ? " selected" : ""}>Oscuro (para colores claros)</option>
            <option value="#FFFFFF"${m.tinta === "#FFFFFF" ? " selected" : ""}>Blanco (para colores oscuros)</option>
          </select></div>
        <div class="campo ancho"><label for="c-descripcion">Descripción</label>
          <textarea id="c-descripcion" data-campo="descripcion" style="min-height:96px">${esc(m.descripcion ?? "")}</textarea></div>
      </div>
      <div class="barra-guardar">
        <button class="btn btn-peligro btn-sm" id="btnBorrar">${icono("i-basura")} Borrar mundo</button>
        <span class="estado" id="estadoForm">${n ? `${n} ${n === 1 ? "personaje" : "personajes"} dentro` : "Vacío"}</span>
      </div>`;

    conectarCampos(m);
    const color = $("#c-acento"), hex = $("#c-acento-hex");
    color.addEventListener("input", () => { hex.value = color.value; });
    hex.addEventListener("input", () => {
      if (/^#[0-9a-f]{6}$/i.test(hex.value)) { color.value = hex.value; aplicar(m, "acento", hex.value); }
    });
    $("#btnBorrar").onclick = () => pedirBorradoMundo(m);
  }

  /* ---------- edición en vivo ---------- */
  function conectarCampos(obj) {
    $$("[data-campo]", $("#formAdmin")).forEach(el => {
      el.addEventListener("input", () => aplicar(obj, el.dataset.campo, el.value, el));
      el.addEventListener("blur", () => validar(el));
    });
  }

  function validar(el) {
    if (el.dataset.campo !== "nombre") return true;
    const caja = el.parentElement.querySelector(".error");
    const vacio = !el.value.trim();
    if (caja) caja.classList.toggle("oculto", !vacio);
    if (caja && vacio) caja.querySelector("span").textContent = "El nombre no puede quedar vacío.";
    el.setAttribute("aria-invalid", vacio ? "true" : "false");
    return !vacio;
  }

  /* Mientras la ficha no se haya publicado, su id sigue al nombre. Después se
     congela: renombrarlo dejaría la imagen huérfana en el repositorio y
     rompería cualquier enlace que alguien haya guardado. */
  function reidentificar(obj, esMundo) {
    if (!Estado.sinPublicar.has(obj.id)) return;
    const viejo = obj.id;
    const lista = esMundo ? Estado.datos.mundos : Estado.datos.personajes;
    const ocupados = lista.filter(x => x !== obj).map(x => x.id);
    const base = esMundo ? obj.nombre : `${obj.mundo} ${obj.nombre}`;
    const nuevo = idLibre(base, ocupados);
    if (nuevo === viejo) return;

    obj.id = nuevo;
    Estado.sinPublicar.delete(viejo);
    Estado.sinPublicar.add(nuevo);

    if (esMundo) {
      Estado.datos.personajes.forEach(p => { if (p.mundo === viejo) p.mundo = nuevo; });
      if (Estado.mundoId === viejo) Estado.mundoId = nuevo;
      if (mundoFiltro === viejo) mundoFiltro = nuevo;
    } else if (obj.imagen) {
      // la imagen pendiente viaja con el id
      const rutaVieja = obj.imagen, rutaNueva = `imagenes/${nuevo}.webp`;
      const pend = Estado.imagenesNuevas.find(i => i.ruta === rutaVieja);
      if (pend) pend.ruta = rutaNueva;
      if (Estado.previas[rutaVieja]) {
        Estado.previas[rutaNueva] = Estado.previas[rutaVieja];
        delete Estado.previas[rutaVieja];
      }
      Estado.rutasABorrar = Estado.rutasABorrar.filter(r => r !== rutaVieja);
      obj.imagen = rutaNueva;
    }

    if (seleccion === viejo) seleccion = nuevo;
    if (Estado.personajeId === viejo) Estado.personajeId = nuevo;
  }

  function aplicar(obj, campo, valor, el) {
    if (campo === "etiquetas") obj.etiquetas = valor.split(",").map(s => s.trim()).filter(Boolean);
    else if (campo === "orden") obj.orden = Number(valor) || 0;
    else obj[campo] = valor;

    if (campo === "nombre" || campo === "mundo") reidentificar(obj, vista === "mundos");

    marcarSucio();
    if (campo === "acento" || campo === "tinta") {
      if (obj.id === Estado.mundoId) aplicarAcento(obj);
    }
    // si le cambias el mundo a un personaje, el filtro le sigue en vez de
    // hacerlo desaparecer de la lista
    if (campo === "mundo" && mundoFiltro) { mundoFiltro = valor; pintarSelectorMundo(); }
    if (el) validar(el);
    pintarLista();
    if (vista === "mundos") pintarMundos();
  }

  function marcarSucio() {
    Estado.sucio = true;
    const est = $("#estadoForm");
    if (est && !est.dataset.fijo) est.innerHTML = `${icono("i-alerta")} Sin publicar`;
    $("#btnPublicar").classList.add("activo");
  }

  /* ---------- imagen ---------- */
  function conectarImagen(p) {
    const zona = $("#zonaSoltar"), input = $("#archivoImg");
    if (!zona) return;
    zona.onclick = () => input.click();
    zona.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    zona.ondragover = e => { e.preventDefault(); zona.classList.add("encima"); };
    zona.ondragleave = () => zona.classList.remove("encima");
    zona.ondrop = e => {
      e.preventDefault(); zona.classList.remove("encima");
      if (e.dataTransfer.files[0]) cargar(e.dataTransfer.files[0], p);
    };
    input.onchange = () => input.files[0] && cargar(input.files[0], p);
    const quitar = $("#quitarImg");
    if (quitar) quitar.onclick = () => {
      soltarImagen(p.imagen);
      p.imagen = "";
      marcarSucio(); pintarFormulario(); pintarLista(); pintarRiel();
    };
  }

  async function cargar(archivo, p) {
    const t = Aviso.trabajando("Procesando la imagen…");
    try {
      const r = await IMG.procesar(archivo);
      const ruta = `imagenes/${p.id}.webp`;
      soltarImagen(p.imagen === ruta ? null : p.imagen);
      Estado.imagenesNuevas = Estado.imagenesNuevas.filter(i => i.ruta !== ruta);
      Estado.imagenesNuevas.push({ ruta, base64: r.base64 });
      Estado.previas[ruta] = r.urlPrevia;
      Estado.rutasABorrar = Estado.rutasABorrar.filter(x => x !== ruta);
      p.imagen = ruta;
      marcarSucio();
      t.cerrar();
      Aviso.ok("Retrato listo", `${r.ancho}×${r.alto} · ${IMG.pesoLegible(r.bytes)}`);
      pintarFormulario(); pintarLista(); pintarRiel();
    } catch (e) {
      t.cerrar();
      Aviso.error("No se pudo usar esa imagen", e.message);
    }
  }

  /* Deja de referenciar una imagen: si nunca se publicó basta con olvidarla,
     si ya está en el repositorio hay que pedir su borrado en el commit. */
  function soltarImagen(ruta) {
    if (!ruta) return;
    const pendiente = Estado.imagenesNuevas.some(i => i.ruta === ruta);
    Estado.imagenesNuevas = Estado.imagenesNuevas.filter(i => i.ruta !== ruta);
    if (Estado.previas[ruta]) { URL.revokeObjectURL(Estado.previas[ruta]); delete Estado.previas[ruta]; }
    if (!pendiente && !Estado.rutasABorrar.includes(ruta)) Estado.rutasABorrar.push(ruta);
  }

  /* ---------- altas ---------- */
  function nuevoPersonaje(mundoId) {
    if (!GH.hayToken()) return $("[data-abrir-sesion]").click();
    if (!Estado.datos.mundos.length) {
      return Aviso.error("Primero necesitas un mundo", "Crea un universo antes de meterle personajes.");
    }
    const mundo = mundoId || Estado.datos.mundos[0].id;
    const p = {
      id: idLibre(`${mundo} sin nombre`, Estado.datos.personajes.map(x => x.id)),
      mundo,
      nombre: "Personaje sin nombre", alias: "", nombreReal: "", edad: "", nacimiento: "",
      especie: "", rol: "", afiliacion: "", primeraAparicion: "", estado: "",
      descripcion: "", etiquetas: [], imagen: "",
    };
    Estado.datos.personajes.push(p);
    Estado.sinPublicar.add(p.id);
    vista = "personajes"; seleccion = p.id; filtro = ""; mundoFiltro = p.mundo;
    $$(".anav[data-vista]").forEach(x => x.classList.toggle("activo", x.dataset.vista === "personajes"));
    marcarSucio(); irA("admin"); pintarPanel();
    setTimeout(() => { const c = $("#c-nombre"); c?.focus(); c?.select(); }, 60);
  }

  function nuevoMundo() {
    const m = {
      id: idLibre("mundo nuevo", Estado.datos.mundos.map(x => x.id)),
      nombre: "Mundo nuevo", acento: "#7C3AED", tinta: "#FFFFFF",
      descripcion: "", orden: Estado.datos.mundos.length,
    };
    Estado.datos.mundos.push(m);
    Estado.sinPublicar.add(m.id);
    vista = "mundos"; seleccion = m.id; filtro = "";
    $$(".anav[data-vista]").forEach(x => x.classList.toggle("activo", x.dataset.vista === "mundos"));
    marcarSucio(); pintarPanel(); pintarMundos();
    setTimeout(() => { const c = $("#c-nombre"); c?.focus(); c?.select(); }, 60);
  }

  /* ---------- borrados ---------- */
  let alConfirmar = null;
  $("#btnConfirmar").onclick = () => { alConfirmar?.(); $("#modalConfirmar").classList.remove("abierto"); };

  function pedirConfirmacion(titulo, texto, accion) {
    $("#confirmarTitulo").textContent = titulo;
    $("#confirmarTexto").textContent = texto;
    alConfirmar = accion;
    $("#modalConfirmar").classList.add("abierto");
  }

  function pedirBorradoPersonaje(p) {
    pedirConfirmacion(`¿Borrar a ${p.nombre}?`,
      "Se quita del catálogo junto con su retrato. No se aplica hasta que publiques, y aun después queda en el historial del repositorio.",
      () => {
        soltarImagen(p.imagen);
        Estado.datos.personajes = Estado.datos.personajes.filter(x => x.id !== p.id);
        seleccion = null; marcarSucio();
        pintarPanel(); pintarMundos(); pintarRiel();
        Aviso.ok("Personaje borrado", "Recuerda publicar para que sea definitivo.");
      });
  }

  function pedirBorradoMundo(m) {
    const dentro = personajesDe(m.id);
    if (dentro.length) {
      return Aviso.error(`«${m.nombre}» no está vacío`,
        `Tiene ${dentro.length} ${dentro.length === 1 ? "personaje" : "personajes"}. Muévelos o bórralos antes de eliminar el mundo.`);
    }
    pedirConfirmacion(`¿Borrar el mundo ${m.nombre}?`, "Está vacío, así que no se pierde ningún personaje.", () => {
      Estado.datos.mundos = Estado.datos.mundos.filter(x => x.id !== m.id);
      if (Estado.mundoId === m.id) {
        Estado.mundoId = Estado.datos.mundos[0]?.id ?? null;
        aplicarAcento(mundoPorId(Estado.mundoId));
      }
      seleccion = null; marcarSucio();
      pintarPanel(); pintarMundos(); pintarRiel();
      Aviso.ok("Mundo borrado");
    });
  }

  /* ---------- publicar ---------- */
  /* Antes de subir se pide una descripción de lo hecho: es lo que queda como
     mensaje del commit, y sin ella el historial es una fila de «Actualizar
     catálogo» imposible de recorrer. */
  $("#btnPublicar").onclick = () => {
    if (!Estado.sucio) return Aviso.ok("No hay nada que publicar", "Todo está ya en GitHub.");

    const sinNombre = [...Estado.datos.personajes, ...Estado.datos.mundos].filter(x => !x.nombre?.trim());
    if (sinNombre.length) {
      return Aviso.error("Hay fichas sin nombre", `${sinNombre.length} sin rellenar. Complétalas antes de publicar.`);
    }

    $("#resumenAuto").textContent = `Se añadirá automáticamente: ${resumirCambios()}`;
    $("#mensajePublicar").value = "";
    $("#modalPublicar").classList.add("abierto");
    setTimeout(() => $("#mensajePublicar").focus(), 60);
  };

  $("#mensajePublicar").addEventListener("keydown", e => {
    if (e.key === "Enter") $("#btnConfirmarPublicar").click();
  });

  $("#btnConfirmarPublicar").onclick = async () => {
    const titulo = $("#mensajePublicar").value.trim();
    if (!titulo) {
      return Aviso.error("Falta la descripción", "Escribe en una línea qué has cambiado.");
    }
    $("#modalPublicar").classList.remove("abierto");
    await publicar(titulo);
  };

  async function publicar(titulo) {
    const t = Aviso.trabajando("Publicando…", "Preparando");
    $("#btnPublicar").disabled = true;
    try {
      const commit = await GH.publicar({
        datos: Estado.datos,
        imagenesNuevas: Estado.imagenesNuevas,
        rutasABorrar: Estado.rutasABorrar,
        mensaje: `${titulo}\n\n${resumirCambios()}`,
        alProgresar: p => t.actualizar(p),
      });
      Estado.sucio = false;
      Estado.imagenesNuevas = []; Estado.rutasABorrar = [];
      Estado.sinPublicar.clear();   // a partir de aquí los ids quedan congelados
      t.cerrar();
      Aviso.ok("Publicado", `Commit ${commit.sha.slice(0, 7)}. La web tarda menos de un minuto en actualizarse.`);
      $("#btnPublicar").classList.remove("activo");
      const est = $("#estadoForm");
      if (est) est.innerHTML = `${icono("i-check")} Publicado`;
    } catch (e) {
      t.cerrar();
      Aviso.error(e.conflicto ? "Conflicto con otro editor" : "No se pudo publicar", e.message);
    } finally {
      $("#btnPublicar").disabled = false;
    }
  }

  const resumirCambios = () => {
    const partes = [];
    if (Estado.imagenesNuevas.length) partes.push(`${Estado.imagenesNuevas.length} imagen(es)`);
    if (Estado.rutasABorrar.length) partes.push(`${Estado.rutasABorrar.length} borrada(s)`);
    const quien = GH.quienEdita()?.login ?? "editor";
    // Va como cuerpo del commit, debajo de la descripción que escribe el editor.
    return `Catálogo con ${Estado.datos.personajes.length} personajes en ${Estado.datos.mundos.length} mundos`
      + (partes.length ? `. ${partes.join(", ")}` : "")
      + `. Publicado desde el panel web por ${quien}.`;
  };

  window.addEventListener("beforeunload", e => {
    if (Estado.sucio) { e.preventDefault(); e.returnValue = ""; }
  });

  return { marcarSesion, nuevoPersonaje, nuevoMundo, abrirAdmin };
})();
