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
    // Cada efecto dice cuánto velo necesita el texto para leerse encima. Las
    // llamas son claras y agresivas y piden el velo entero; la Puerta ya se
    // oscurece sola por la derecha dentro del propio shader.
    contenedor.style.setProperty("--velo", ef.velo ?? 1);
    vivo = ef.iniciar(lienzo, contenedor);
  }

  function parar() {
    if (vivo?.parar) vivo.parar();
    vivo = null;
    document.querySelectorAll(".efecto").forEach(c => {
      c.parentElement?.style.removeProperty("--velo");
      c.remove();
    });
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


  /* ---------- oro: la Puerta de Babilonia, en WebGL ----------
     El shader se generó en ShaderGPT y va casi tal cual. Solo se le quitó la
     directiva «#include <colorspace_fragment>», que es propia de Three.js y
     aquí no compila, y el ratón se deja siempre fuera del lienzo para que su
     influencia valga cero: el panel lleva texto encima y no queremos que el
     fondo se mueva al pasar por él. */

  const VS_PLANO = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

  const FS_PUERTA = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_uv;

// Hash functions
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
vec2 hash2v(vec2 p) { return vec2(hash2(p), hash2(p + vec2(37.0, 41.0))); }

// Noise
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

    float t = u_time * 0.4;

    vec3 bgColor = vec3(0.078, 0.078, 0.114); // #14141D
    vec3 gold = vec3(0.9, 0.698, 0.235);       // #E6B23C
    vec3 brightGold = vec3(1.0, 0.925, 0.667); // #FFECAA

    vec3 col = bgColor;

    // Portal definitions: position, base radius, depth (0=near, 1=far), phase offset
    vec2 portalPos[4];
    float portalRad[4];
    float portalDepth[4];
    float portalPhase[4];

    // Repartidos para asomar ALREDEDOR del retrato, que ocupa el tercio
    // izquierdo del panel. Si se quedan donde los puso el shader original
    // quedan todos tapados por Gilgamesh y no se ve nada.
    portalPos[0] = vec2(-0.30 * aspect, 0.26);
    portalRad[0] = 0.11;
    portalDepth[0] = 0.0; // nearest
    portalPhase[0] = 0.0;

    portalPos[1] = vec2(-0.13 * aspect, -0.30);
    portalRad[1] = 0.085;
    portalDepth[1] = 0.3;
    portalPhase[1] = 1.5;

    portalPos[2] = vec2(0.06 * aspect, 0.22);
    portalRad[2] = 0.07;
    portalDepth[2] = 0.6;
    portalPhase[2] = 3.0;

    portalPos[3] = vec2(0.28 * aspect, -0.20);
    portalRad[3] = 0.06;
    portalDepth[3] = 0.85;
    portalPhase[3] = 4.5;

    // Mouse influence
    vec2 mouseP = vec2((u_mouse.x - 0.5) * aspect, u_mouse.y - 0.5);

    for (int i = 0; i < 4; i++) {
        // Breathing cycle
        float phase = portalPhase[i];
        float cycle = mod(t + phase, 8.0);
        float life = 0.0;
        if (cycle < 1.0) life = smoothstep(0.0, 1.0, cycle); // fade in
        else if (cycle < 2.0) life = 1.0 + 0.1 * (cycle - 1.0); // expand
        else if (cycle < 5.0) life = 1.1; // hold
        else if (cycle < 6.0) life = 1.1 - 0.1 * (cycle - 5.0); // shrink
        else if (cycle < 7.0) life = smoothstep(1.0, 0.0, cycle - 6.0); // fade out
        else life = 0.0;

        float alpha = clamp(life, 0.0, 1.0);
        float sizeScale = clamp(life, 0.0, 1.1);

        if (alpha < 0.01) continue;

        float depth = portalDepth[i];
        float depthDim = mix(1.0, 0.40, depth);
        float depthBlur = mix(0.0, 0.03, depth);
        float baseRad = portalRad[i] * sizeScale;

        // Mouse interaction - subtle size increase near mouse
        float mouseDist = length(portalPos[i] - mouseP);
        float mouseInfluence = exp(-mouseDist * 5.0) * 0.05;
        baseRad += mouseInfluence;

        vec2 d = p - portalPos[i];
        float dist = length(d);
        float angle = atan(d.y, d.x);

        // FBM wobble on radius
        float wobble = fbm3(vec2(angle * 2.0, t * 0.8 + phase)) * 0.03;
        float wobble2 = fbm3(vec2(angle * 3.0 + 10.0, t * 0.6 + phase * 2.0)) * 0.015;
        float perturbedRad = baseRad + wobble + wobble2;

        float sdf = dist - perturbedRad;

        // Angular notches
        float notchAngle = mod(angle + t * 0.1, 3.14159 / 6.0) - 3.14159 / 12.0;
        float notch = smoothstep(0.005, 0.01, abs(notchAngle));
        float notchRing = smoothstep(0.02, 0.0, abs(sdf)) * (1.0 - notch) * 0.5;

        // Space tearing - thin bright band at edge
        float tearWidth = 0.008 + depthBlur;
        float tear = exp(-abs(sdf) / tearWidth) * 0.7;

        // Concentric ripple rings
        float ripples = 0.0;
        for (int r = 0; r < 5; r++) {
            float rr = float(r);
            float rippleRad = perturbedRad * (0.3 + rr * 0.18);
            float rippleExpand = rippleRad + sin(t * 0.5 + phase + rr * 0.7) * 0.01;
            float rippleDist = abs(dist - rippleExpand);
            float rippleWidth = 0.002 + rr * 0.002;
            float rippleIntensity = (1.0 - rr * 0.18);
            ripples += rippleIntensity * exp(-rippleDist / rippleWidth) * 0.4;
        }
        ripples *= step(dist, perturbedRad + 0.01);

        // Liquid gold surface interior
        float interior = 0.0;
        if (dist < perturbedRad - 0.005) {
            float normalizedDist = dist / perturbedRad;
            // Flowing liquid gold
            vec2 flowUV = d * 10.0;
            float flow1 = fbm(flowUV + vec2(t * 0.3, t * 0.2));
            float flow2 = fbm(flowUV * 1.5 - vec2(t * 0.2, t * 0.35) + 5.0);
            float liquid = flow1 * 0.6 + flow2 * 0.4;

            // Highlights
            float highlight = pow(liquid, 3.0) * 1.5;
            float edgeDark = smoothstep(0.0, 0.5, 1.0 - normalizedDist);

            interior = (0.3 + highlight * 0.7) * edgeDark;
            interior *= smoothstep(perturbedRad, perturbedRad - 0.015, dist);
        }

        // Light rays
        float rays = 0.0;
        if (sdf > -0.01 && sdf < 0.15) {
            float rayAngle = angle * 12.0 + t * 0.5 + phase * 3.0;
            float rayPattern = pow(max(0.0, sin(rayAngle)), 20.0);
            float rayFalloff = exp(-max(0.0, sdf) * 25.0);
            rays = rayPattern * rayFalloff * 0.6;
        }

        // Compose portal
        float portalAlpha = alpha * depthDim;

        // Interior gold
        vec3 interiorCol = mix(gold * 0.6, brightGold, interior * 0.5) * interior;
        col += interiorCol * portalAlpha;

        // Ripple rings
        col += mix(gold, brightGold, ripples) * ripples * portalAlpha;

        // Notch details
        col += gold * notchRing * portalAlpha * 0.8;

        // Edge tear
        col += brightGold * tear * portalAlpha;

        // Light rays
        col += mix(gold, brightGold, 0.3) * rays * portalAlpha * 0.5;

        // Outer glow - steep falloff
        float glow = exp(-max(0.0, sdf) * 40.0) * 0.3;
        glow = pow(glow, 2.0);
        col += gold * glow * portalAlpha * 0.5;
    }

    // Dust particles
    for (int i = 0; i < 20; i++) {
        float fi = float(i);
        vec2 dustPos = vec2(
            (hash(fi * 13.37) - 0.5) * aspect * 0.8 - 0.1 * aspect,
            mod(hash(fi * 7.13) + t * 0.02 * (0.5 + hash(fi * 3.71) * 0.5), 1.0) - 0.5
        );
        float dustDist = length(p - dustPos);
        float twinkle = sin(t * (1.0 + hash(fi * 19.3) * 2.0) + fi * 5.0) * 0.5 + 0.5;
        twinkle = pow(twinkle, 3.0);
        float dustBright = exp(-dustDist / 0.003) * twinkle * 0.15;
        col += gold * dustBright;
    }

    // Ganancia de integración: el shader se calibró viéndose a pantalla
    // completa. Dentro del panel, y con el velo del texto encima, se queda
    // corto; esto sube solo lo que hay POR ENCIMA del fondo, sin aclararlo.
    col = bgColor + (col - bgColor) * 2.0;

    // Darken right half for text
    float rightDarken = smoothstep(0.1 * aspect, 0.3 * aspect, p.x);
    col = mix(col, bgColor, rightDarken * 0.4);

    // Ensure background stays dark
    col = max(col, bgColor * 0.5);

    // Tone mapping to keep metallic feel
    col = col / (1.0 + col * 0.3);

    gl_FragColor = vec4(col, 1.0);
}`;

  /* Monta un shader de pantalla completa sobre el lienzo. Devuelve el mismo
     contrato que los efectos 2D: un objeto con parar(). */
  function shaderPantalla(fuente, { dpr = 1.5, tiempoQuieto = 6.25 } = {}) {
    return (lienzo, caja) => {
      const gl = lienzo.getContext("webgl", { antialias: false, depth: false, stencil: false })
        || lienzo.getContext("experimental-webgl", { antialias: false, depth: false, stencil: false });
      // Sin WebGL no hay efecto, pero la ficha se sigue viendo perfectamente.
      if (!gl) return { parar() { } };

      const compilar = (tipo, txt) => {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, txt);
        gl.compileShader(s);
        if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
        console.warn("Efecto: el shader no compila\n" + gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      };

      const vs = compilar(gl.VERTEX_SHADER, VS_PLANO);
      const fs = compilar(gl.FRAGMENT_SHADER, fuente);
      if (!vs || !fs) return { parar() { } };

      const prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("Efecto: el programa no enlaza\n" + gl.getProgramInfoLog(prog));
        return { parar() { } };
      }
      gl.useProgram(prog);

      // Un rectángulo que cubre toda la pantalla; el shader hace el resto.
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTiempo = gl.getUniformLocation(prog, "u_time");
      const uRes = gl.getUniformLocation(prog, "u_resolution");
      const uRaton = gl.getUniformLocation(prog, "u_mouse");

      let anim = null, perdido = false;

      const medir = () => {
        const r = caja.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, dpr);
        const w = Math.max(1, Math.round(r.width * d));
        const h = Math.max(1, Math.round(r.height * d));
        if (w === lienzo.width && h === lienzo.height) return;
        lienzo.width = w; lienzo.height = h;
        gl.viewport(0, 0, w, h);
      };

      const pintar = (segundos) => {
        if (perdido) return;
        gl.uniform1f(uTiempo, segundos);
        gl.uniform2f(uRes, lienzo.width, lienzo.height);
        gl.uniform2f(uRaton, -10, -10);   // ratón siempre lejos: influencia cero
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };

      medir();
      // Si se monta antes de que el panel tenga maquetación, el lienzo saldría
      // a cero y no se volvería a medir hasta un resize.
      if (!lienzo.width || !lienzo.height) requestAnimationFrame(medir);

      const alPerder = (e) => { e.preventDefault(); perdido = true; cancelAnimationFrame(anim); };
      lienzo.addEventListener("webglcontextlost", alPerder);

      const soltar = () => {
        lienzo.removeEventListener("webglcontextlost", alPerder);
        gl.getExtension("WEBGL_lose_context")?.loseContext();   // libera la GPU ya
      };

      if (menosMovimiento()) { pintar(tiempoQuieto); return { parar: soltar }; }

      const inicio = performance.now();
      const paso = () => {
        medir();
        pintar((performance.now() - inicio) / 1000);
        anim = requestAnimationFrame(paso);
      };
      anim = requestAnimationFrame(paso);

      const alRedimensionar = () => medir();
      addEventListener("resize", alRedimensionar);
      return {
        parar() {
          cancelAnimationFrame(anim);
          removeEventListener("resize", alRedimensionar);
          soltar();
        }
      };
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
    nombre: "Puerta de Babilonia",
    velo: 0.6,
    iniciar: shaderPantalla(FS_PUERTA),
  };

  return { montar, parar, disponibles, hay: c => Boolean(registro[c]) };
})();
