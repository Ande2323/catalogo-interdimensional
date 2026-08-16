/* Puente con la API de GitHub.
   Publicar = un único commit con datos.json y las imágenes nuevas juntas,
   para que el historial sea legible y se pueda revertir de una pieza. */
const GH = (() => {
  const LLAVE = "catalogo:token";
  let token = localStorage.getItem(LLAVE) || "";
  let usuario = null;
  let shaBase = null;          // rama en el momento de empezar a editar

  const hayToken = () => Boolean(token);
  const quienEdita = () => usuario;

  async function api(ruta, opciones = {}) {
    const r = await fetch(ruta.startsWith("http") ? ruta : CONFIG.api + ruta, {
      ...opciones,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opciones.body ? { "Content-Type": "application/json" } : {}),
        ...opciones.headers,
      },
    });
    if (!r.ok) {
      let detalle = "";
      try { detalle = (await r.json()).message || ""; } catch { /* respuesta sin cuerpo */ }
      const e = new Error(detalle || `Error ${r.status}`);
      e.estado = r.status;
      throw e;
    }
    return r.status === 204 ? null : r.json();
  }

  /* ---------- sesión ---------- */
  async function entrar(nuevoToken) {
    const anterior = token;
    token = nuevoToken.trim();
    try {
      usuario = await api("https://api.github.com/user");
      await api("");                       // ¿tenemos acceso a este repo?
      localStorage.setItem(LLAVE, token);
      shaBase = await refActual();
      return usuario;
    } catch (e) {
      token = anterior;
      if (e.estado === 401) throw new Error("El token no es válido o ha caducado.");
      if (e.estado === 404) throw new Error("El token es válido pero no llega a este repositorio. Si colaboras en el repo de otra persona, el token fino no sirve: crea uno clásico con la casilla «public_repo».");
      if (e.estado === 403) throw new Error("GitHub ha rechazado la petición. Revisa que el token tenga permiso de escritura y que sigas siendo colaborador del repositorio.");
      throw e;
    }
  }

  async function reanudar() {
    if (!token || !CONFIG.configurado) return null;
    try {
      usuario = await api("https://api.github.com/user");
      shaBase = await refActual();
      return usuario;
    } catch {
      salir();
      return null;
    }
  }

  function salir() {
    token = ""; usuario = null; shaBase = null;
    localStorage.removeItem(LLAVE);
  }

  /* ---------- lectura ---------- */
  async function leerDatos() {
    const r = await fetch(`datos.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error("No se pudo cargar datos.json");
    return r.json();
  }

  const refActual = async () =>
    (await api(`/git/ref/heads/${CONFIG.rama}`)).object.sha;

  /* ---------- escritura ---------- */
  /* cambios = { datos, imagenesNuevas:[{ruta,base64}], rutasABorrar:[] } */
  async function publicar({ datos, imagenesNuevas = [], rutasABorrar = [], mensaje, alProgresar = () => {} }) {
    if (!token) throw new Error("No hay sesión de editor.");

    alProgresar("Comprobando si alguien ha publicado antes que tú…");
    const shaRemoto = await refActual();
    if (shaBase && shaRemoto !== shaBase) {
      const e = new Error("Alguien más ha publicado cambios mientras editabas. Recarga la página para traerlos y vuelve a aplicar lo tuyo; si publicas ahora perderías su trabajo.");
      e.conflicto = true;
      throw e;
    }

    const arbol = [];

    let n = 0;
    for (const img of imagenesNuevas) {
      alProgresar(`Subiendo imagen ${++n} de ${imagenesNuevas.length}…`);
      const blob = await api("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: img.base64, encoding: "base64" }),
      });
      arbol.push({ path: img.ruta, mode: "100644", type: "blob", sha: blob.sha });
    }

    alProgresar("Preparando los datos…");
    datos.actualizado = new Date().toISOString();
    const blobDatos = await api("/git/blobs", {
      method: "POST",
      body: JSON.stringify({ content: JSON.stringify(datos, null, 1), encoding: "utf-8" }),
    });
    arbol.push({ path: "datos.json", mode: "100644", type: "blob", sha: blobDatos.sha });

    for (const ruta of rutasABorrar) {
      arbol.push({ path: ruta, mode: "100644", type: "blob", sha: null });
    }

    alProgresar("Creando el commit…");
    const commitBase = await api(`/git/commits/${shaRemoto}`);
    const nuevoArbol = await api("/git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: commitBase.tree.sha, tree: arbol }),
    });
    const commit = await api("/git/commits", {
      method: "POST",
      body: JSON.stringify({ message: mensaje, tree: nuevoArbol.sha, parents: [shaRemoto] }),
    });

    alProgresar("Publicando…");
    try {
      await api(`/git/refs/heads/${CONFIG.rama}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
    } catch (e) {
      if (e.estado === 422) {
        const c = new Error("Justo alguien publicó a la vez que tú. Recarga la página y vuelve a intentarlo.");
        c.conflicto = true;
        throw c;
      }
      throw e;
    }

    shaBase = commit.sha;
    return commit;
  }

  return { hayToken, quienEdita, entrar, reanudar, salir, leerDatos, publicar };
})();
