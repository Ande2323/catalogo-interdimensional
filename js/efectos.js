/* Efectos de fondo para fichas concretas.
   Cada personaje puede llevar un campo «efecto» con la clave de uno de estos.
   Solo corre el de la ficha abierta: al cambiar de personaje se para el
   anterior, así nunca hay más de una animación viva. */
const Efectos = (() => {
  const registro = {};
  let vivo = null;

  const disponibles = () => Object.entries(registro).map(([k, v]) => ({ clave: k, nombre: v.nombre }));
  const menosMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function montar(clave, contenedor) {
    parar();
    const ef = registro[clave];
    if (!ef || !contenedor) return;
    const lienzo = document.createElement("canvas");
    lienzo.className = "efecto";
    contenedor.prepend(lienzo);
    vivo = ef.iniciar(lienzo, contenedor);
  }

  function parar() {
    if (vivo?.parar) vivo.parar();
    vivo = null;
    document.querySelectorAll(".efecto").forEach(c => c.remove());
  }

  /* ---------- fuego: llamas en el borde inferior y brasas que suben ---------- */
  function fuego({ colores, llama, brillo, densidad = 1, altoLlama = 0.17 }) {
    return (lienzo, caja) => {
      const ctx = lienzo.getContext("2d");
      let ancho = 0, alto = 0, particulas = [], anim = null, t = 0;

      const medir = () => {
        const r = caja.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);   // 2x basta y no ahoga la CPU
        ancho = r.width; alto = r.height;
        lienzo.width = Math.max(1, ancho * d); lienzo.height = Math.max(1, alto * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
      };
      // Las brasas se reparten por área: en un panel ancho hacen falta muchas más
      // que en uno estrecho para que la densidad se vea igual.
      const cuantas = () => Math.round((ancho * alto) / 5200 * densidad);

      const nacer = (repartida = false) => ({
        x: Math.random() * ancho,
        y: repartida ? Math.random() * alto : alto - Math.random() * alto * altoLlama,
        r: 0.6 + Math.random() * 2.4,
        vy: 0.35 + Math.random() * 1.25,
        vx: (Math.random() - 0.5) * 0.5,
        vida: 0, total: 170 + Math.random() * 260,
        color: colores[(Math.random() * colores.length) | 0],
        fase: Math.random() * Math.PI * 2,
        amp: 3 + Math.random() * 9,
      });
      const sembrar = () => { particulas = Array.from({ length: cuantas() }, () => nacer(true)); };

      medir();
      // Si se monta antes de que el panel tenga maquetación, el lienzo saldría a
      // cero y no volvería a medirse hasta un resize.
      requestAnimationFrame(() => { if (!ancho || !alto) { medir(); sembrar(); } });
      sembrar();

      /* Las lenguas de fuego del borde: varias capas de senos desfasados que
         suben y bajan, dibujadas como una silueta rellena con degradado. */
      function pintarLlamas() {
        const base = alto, techo = alto * (1 - altoLlama);
        for (let capa = 0; capa < 3; capa++) {
          const desfase = capa * 1.7, escala = 1 - capa * 0.22;
          ctx.beginPath();
          ctx.moveTo(0, base);
          for (let x = 0; x <= ancho; x += 6) {
            const n =
              Math.sin(x / 47 + t / 34 + desfase) * 0.5 +
              Math.sin(x / 19 - t / 21 + desfase) * 0.3 +
              Math.sin(x / 8 + t / 13 + desfase) * 0.2;
            const y = base - (alto - techo) * escala * (0.45 + n * 0.55);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(ancho, base);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, techo, 0, base);
          g.addColorStop(0, "transparent");
          g.addColorStop(1, llama);
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.5 - capa * 0.13;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function pintar() {
        ctx.clearRect(0, 0, ancho, alto);

        const g = ctx.createRadialGradient(ancho / 2, alto * 1.08, 0, ancho / 2, alto * 1.08, alto * 1.15);
        g.addColorStop(0, brillo); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, ancho, alto);

        ctx.globalCompositeOperation = "lighter";   // el fuego se suma, no se tapa
        pintarLlamas();
        for (const p of particulas) {
          const v = p.vida / p.total;
          const alfa = v < 0.12 ? v / 0.12 : (1 - v);
          ctx.globalAlpha = Math.max(0, alfa) * 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.fase + p.vida / 26) * p.amp, p.y, p.r, 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      if (menosMovimiento()) { pintar(); return { parar() { } }; }

      function paso() {
        t++;
        for (let i = 0; i < particulas.length; i++) {
          const p = particulas[i];
          p.y -= p.vy; p.x += p.vx; p.vida++;
          if (p.vida > p.total || p.y < -12) particulas[i] = nacer();
        }
        pintar();
        anim = requestAnimationFrame(paso);
      }
      anim = requestAnimationFrame(paso);

      const alRedimensionar = () => { medir(); sembrar(); };
      addEventListener("resize", alRedimensionar);
      return { parar() { cancelAnimationFrame(anim); removeEventListener("resize", alRedimensionar); } };
    };
  }

  registro["llamas-oscuras"] = {
    nombre: "Llamas oscuras",
    iniciar: fuego({
      colores: ["#F43F5E", "#DC2626", "#B91C3C", "#FDBA74", "#FCA5A5"],
      llama: "rgba(220, 38, 60, .55)",
      brillo: "rgba(190, 25, 55, .30)",
      densidad: 1.6,
      altoLlama: 0.20,
    }),
  };

  return { montar, parar, disponibles, hay: c => Boolean(registro[c]) };
})();
