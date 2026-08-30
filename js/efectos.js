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

  /* ---------- brasas: ascuas que suben, para personajes de fuego ---------- */
  function brasas({ colores, cantidad = 70, brillo }) {
    return (lienzo, caja) => {
      const ctx = lienzo.getContext("2d");
      let ancho = 0, alto = 0, particulas = [], anim = null;

      const medir = () => {
        const r = caja.getBoundingClientRect();
        const d = window.devicePixelRatio || 1;
        ancho = r.width; alto = r.height;
        lienzo.width = ancho * d; lienzo.height = alto * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
      };
      const nacer = (arriba = false) => ({
        x: Math.random() * ancho,
        y: arriba ? Math.random() * alto : alto + Math.random() * 40,
        r: 0.7 + Math.random() * 2.1,
        vy: 0.25 + Math.random() * 0.75,
        vx: (Math.random() - 0.5) * 0.35,
        vida: 0, total: 220 + Math.random() * 260,
        color: colores[(Math.random() * colores.length) | 0],
        fase: Math.random() * Math.PI * 2,
      });

      medir();
      // Si se monta antes de que el panel tenga maquetación, el lienzo saldría
      // a cero y no volvería a medirse hasta un resize. Se remide al frame
      // siguiente, cuando el tamaño ya es real.
      requestAnimationFrame(() => { if (!ancho || !alto) { medir(); sembrar(); } });
      const sembrar = () => { particulas = Array.from({ length: cantidad }, () => nacer(true)); };
      sembrar();

      // Sin movimiento: una sola pasada estática y se acabó.
      if (menosMovimiento()) {
        pintar(); return { parar() { } };
      }

      function pintar() {
        ctx.clearRect(0, 0, ancho, alto);
        // resplandor de fondo, anclado abajo
        const g = ctx.createRadialGradient(ancho / 2, alto * 1.05, 0, ancho / 2, alto * 1.05, alto * 0.95);
        g.addColorStop(0, brillo); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, ancho, alto);

        for (const p of particulas) {
          const t = p.vida / p.total;
          const alfa = t < 0.15 ? t / 0.15 : (1 - t) * 0.9;   // aparece y se apaga
          ctx.globalAlpha = Math.max(0, alfa) * 0.85;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(p.fase + p.vida / 30) * 6, p.y, p.r, 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function paso() {
        for (let i = 0; i < particulas.length; i++) {
          const p = particulas[i];
          p.y -= p.vy; p.x += p.vx; p.vida++;
          if (p.vida > p.total || p.y < -10) particulas[i] = nacer();
        }
        pintar();
        anim = requestAnimationFrame(paso);
      }
      anim = requestAnimationFrame(paso);

      const alRedimensionar = () => medir();
      addEventListener("resize", alRedimensionar);
      return { parar() { cancelAnimationFrame(anim); removeEventListener("resize", alRedimensionar); } };
    };
  }

  registro["llamas-oscuras"] = {
    nombre: "Llamas oscuras",
    iniciar: brasas({
      colores: ["#F43F5E", "#B91C3C", "#7C2D3E", "#FDBA74"],
      cantidad: 80,
      brillo: "rgba(190, 30, 60, .22)",
    }),
  };

  return { montar, parar, disponibles, hay: c => Boolean(registro[c]) };
})();
