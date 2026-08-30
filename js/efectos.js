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


  /* ---------- oro: portales que se abren y asoman filos ---------- */
  function puertaDorada({ oro, destello, densidad = 1 }) {
    return (lienzo, caja) => {
      const ctx = lienzo.getContext("2d");
      let ancho = 0, alto = 0, portales = [], motas = [], anim = null, t = 0;

      const medir = () => {
        const r = caja.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);
        ancho = r.width; alto = r.height;
        lienzo.width = Math.max(1, ancho * d); lienzo.height = Math.max(1, alto * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
      };

      const nuevoPortal = (yaAbierto = false) => ({
        x: 30 + Math.random() * (ancho - 60),
        y: 20 + Math.random() * (alto - 40),
        rMax: 16 + Math.random() * 30,
        ang: Math.random() * Math.PI * 2,
        largo: 34 + Math.random() * 62,
        vida: yaAbierto ? Math.random() * 150 : 0,
        total: 150 + Math.random() * 130,
        espera: yaAbierto ? 0 : Math.random() * 120,
      });
      const nuevaMota = (repartida = false) => ({
        x: Math.random() * ancho,
        y: repartida ? Math.random() * alto : alto + 10,
        r: 0.5 + Math.random() * 1.7,
        vy: 0.12 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.22,
        fase: Math.random() * Math.PI * 2,
      });
      const sembrar = () => {
        const area = ancho * alto;
        portales = Array.from({ length: Math.max(3, Math.round(area / 42000 * densidad)) }, () => nuevoPortal(true));
        motas = Array.from({ length: Math.round(area / 5600 * densidad) }, () => nuevaMota(true));
      };

      medir();
      requestAnimationFrame(() => { if (!ancho || !alto) { medir(); sembrar(); } });
      sembrar();

      /* Un filo asomando: dos triángulos alargados que salen del portal y se
         retiran, más un destello en la punta. */
      function pintarFilo(p, f) {
        const salida = Math.sin(Math.min(f, 1) * Math.PI);       // sale y vuelve
        const L = p.largo * salida;
        if (L < 2) return;
        const dx = Math.cos(p.ang), dy = Math.sin(p.ang), ax = -dy, ay = dx;
        const w = 4.4 * salida;
        ctx.beginPath();
        ctx.moveTo(p.x + dx * L, p.y + dy * L);
        ctx.lineTo(p.x + ax * w, p.y + ay * w);
        ctx.lineTo(p.x - ax * w, p.y - ay * w);
        ctx.closePath();
        const g = ctx.createLinearGradient(p.x, p.y, p.x + dx * L, p.y + dy * L);
        g.addColorStop(0, oro); g.addColorStop(1, destello);
        ctx.fillStyle = g; ctx.globalAlpha = salida; ctx.fill();

        ctx.globalAlpha = salida;                                 // brillo de la punta
        ctx.fillStyle = destello;
        ctx.beginPath(); ctx.arc(p.x + dx * L, p.y + dy * L, 2.2, 0, 7); ctx.fill();
        // destello en cruz sobre la punta
        ctx.strokeStyle = destello; ctx.lineWidth = 1; ctx.globalAlpha = salida * 0.8;
        const bx = p.x + dx * L, by = p.y + dy * L, k = 9 * salida;
        ctx.beginPath();
        ctx.moveTo(bx - k, by); ctx.lineTo(bx + k, by);
        ctx.moveTo(bx, by - k); ctx.lineTo(bx, by + k);
        ctx.stroke();
      }

      function pintar() {
        ctx.clearRect(0, 0, ancho, alto);
        const g = ctx.createRadialGradient(ancho / 2, -alto * 0.15, 0, ancho / 2, -alto * 0.15, alto * 1.3);
        g.addColorStop(0, oro.replace(/[\d.]+\)$/, "0.20)")); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, ancho, alto);

        ctx.globalCompositeOperation = "lighter";
        for (const m of motas) {                                  // polvo de oro
          ctx.globalAlpha = 0.22 + Math.abs(Math.sin(m.fase + t / 42)) * 0.5;
          ctx.fillStyle = oro;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
        }
        for (const p of portales) {
          if (p.vida < p.espera) continue;
          const f = (p.vida - p.espera) / p.total;
          if (f > 1) continue;
          const abre = Math.sin(Math.min(f * 1.6, 1) * Math.PI);  // el portal late
          const rx = p.rMax * abre, ry = rx * 0.42;

          // Halo: un degradado que se apaga hacia fuera. Nada de relleno plano,
          // que a poca opacidad se ve pardo en vez de dorado.
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rx * 1.9);
          halo.addColorStop(0, destello); halo.addColorStop(0.35, oro); halo.addColorStop(1, "transparent");
          ctx.globalAlpha = abre * 0.30;
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * 1.9, ry * 1.9, p.ang, 0, 7); ctx.fill();

          ctx.globalAlpha = abre * 0.5;                            // aro exterior difuso
          ctx.strokeStyle = oro; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, p.ang, 0, 7); ctx.stroke();
          ctx.globalAlpha = abre;                                  // filo del aro, nítido
          ctx.strokeStyle = destello; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, p.ang, 0, 7); ctx.stroke();

          pintarFilo(p, f * 1.35);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      if (menosMovimiento()) { pintar(); return { parar() { } }; }

      function paso() {
        t++;
        for (let i = 0; i < portales.length; i++) {
          const p = portales[i];
          p.vida++;
          if (p.vida > p.espera + p.total) portales[i] = nuevoPortal();
        }
        for (let i = 0; i < motas.length; i++) {
          const m = motas[i];
          m.y -= m.vy; m.x += m.vx;
          if (m.y < -8) motas[i] = nuevaMota();
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

  registro["puerta-dorada"] = {
    nombre: "Puerta dorada",
    iniciar: puertaDorada({
      oro: "rgba(230, 178, 60, .85)",
      destello: "rgba(255, 236, 170, .95)",
      densidad: 1.25,
    }),
  };

  return { montar, parar, disponibles, hay: c => Boolean(registro[c]) };
})();
