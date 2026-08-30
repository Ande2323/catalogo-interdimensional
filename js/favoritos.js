/* Cuentas y favoritos, contra Supabase.
   Sin sesión los favoritos viven en el navegador; al entrar en una cuenta se
   suben los que hubiera y a partir de ahí van a la nube. */
const Fav = (() => {
  const LOCAL = "catalogo:favoritos";
  let cliente = null;
  let usuario = null;
  let marcados = new Set();

  const hayCuenta = () => Boolean(usuario);
  const quien = () => usuario;
  const es = id => marcados.has(id);
  const cuantos = () => marcados.size;
  const todos = () => [...marcados];

  /* ---------- almacenamiento local (sin sesión) ---------- */
  function leerLocal() {
    try { return new Set(JSON.parse(localStorage.getItem(LOCAL) || "[]")); }
    catch { return new Set(); }
  }
  function guardarLocal() {
    try { localStorage.setItem(LOCAL, JSON.stringify([...marcados])); } catch { /* modo privado */ }
  }

  /* ---------- arranque ---------- */
  async function iniciar() {
    marcados = leerLocal();

    if (!window.supabase || !SUPABASE.url) {   // sin biblioteca: solo local
      pintarTodo();
      return;
    }
    cliente = window.supabase.createClient(SUPABASE.url, SUPABASE.clave);

    const { data } = await cliente.auth.getSession();
    if (data?.session?.user) {
      usuario = data.session.user;
      await sincronizar();
    }
    cliente.auth.onAuthStateChange((_evento, sesion) => {
      usuario = sesion?.user ?? null;
      pintarSesion();
    });
    pintarTodo();
  }

  /* Al entrar, se suben los favoritos que estuvieran solo en el navegador y se
     mezclan con los de la cuenta: nadie pierde lo que había marcado antes. */
  async function sincronizar() {
    const locales = [...leerLocal()];
    if (locales.length) {
      await cliente.from("favoritos")
        .upsert(locales.map(p => ({ usuario: usuario.id, personaje: p })),
                { onConflict: "usuario,personaje" });
      localStorage.removeItem(LOCAL);
    }
    const { data, error } = await cliente.from("favoritos").select("personaje");
    if (error) { Aviso.error("No se pudieron cargar tus favoritos", error.message); return; }
    marcados = new Set(data.map(f => f.personaje));
  }

  /* ---------- sesión ---------- */
  async function registrar(correo, clave) {
    const { data, error } = await cliente.auth.signUp({ email: correo, password: clave });
    if (error) throw new Error(traducir(error.message));
    if (!data.session) throw new Error("Revisa tu correo para confirmar la cuenta.");
    usuario = data.user;
    await sincronizar();
    pintarTodo();
    return usuario;
  }

  async function entrar(correo, clave) {
    const { data, error } = await cliente.auth.signInWithPassword({ email: correo, password: clave });
    if (error) throw new Error(traducir(error.message));
    usuario = data.user;
    await sincronizar();
    pintarTodo();
    return usuario;
  }

  async function salir() {
    await cliente?.auth.signOut();
    usuario = null;
    marcados = leerLocal();
    Estado.vistaFavoritos = false;
    pintarTodo();
  }

  const traducir = m =>
    /Invalid login/i.test(m) ? "Correo o contraseña incorrectos." :
    /already registered/i.test(m) ? "Ese correo ya tiene cuenta. Entra en vez de registrarte." :
    /at least 6/i.test(m) ? "La contraseña necesita al menos 6 caracteres." :
    /valid email/i.test(m) ? "Ese correo no tiene buena pinta." : m;

  /* ---------- marcar y desmarcar ---------- */
  async function alternar(id) {
    const estaba = marcados.has(id);
    estaba ? marcados.delete(id) : marcados.add(id);
    pintarTodo();                                  // respuesta inmediata

    if (!usuario) { guardarLocal(); return; }

    const q = estaba
      ? cliente.from("favoritos").delete().eq("usuario", usuario.id).eq("personaje", id)
      : cliente.from("favoritos").insert({ usuario: usuario.id, personaje: id });
    const { error } = await q;
    if (error) {                                   // se deshace si el servidor dice que no
      estaba ? marcados.add(id) : marcados.delete(id);
      pintarTodo();
      Aviso.error("No se pudo guardar", error.message);
    }
  }

  /* ---------- pintado ---------- */
  function pintarSesion() {
    const b = $("#btnCuenta");
    if (!b) return;
    b.querySelector("span").textContent = usuario ? usuario.email.split("@")[0] : "Iniciar sesión";
    b.classList.toggle("con-cuenta", Boolean(usuario));
  }
  function pintarTodo() {
    pintarSesion();
    if (typeof pintarMundos === "function") pintarMundos();
    if (typeof pintarRiel === "function") pintarRiel();
  }

  return { iniciar, hayCuenta, quien, es, cuantos, todos, alternar, registrar, entrar, salir };
})();
