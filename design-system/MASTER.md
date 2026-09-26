# Design System Master File — «Expediente»

> **Rama de propuesta:** `claude/rediseno-dossier` (opción B). La versión anterior,
> «Archivo en tinta», sigue en `main` y se conserva abajo como referencia.

**Rediseñado:** 2026-09-24 · **Category:** Archivo / catálogo de consulta

## La idea

**El catálogo es un archivador de papel.** Cada mundo es una carpeta con su
pestaña de color; cada personaje, una hoja de expediente con la foto grapada,
los datos a máquina y un sello. La casa es de papel y tinta; el mundo abierto
pone el color de la pestaña, la cinta del retrato elegido y el sello.

## Paleta

| Rol | Hex | Variable |
|-----|-----|----------|
| Escritorio (portada) | `#E3DBC9` | `--p-escritorio` |
| Fondo | `#ECE6D8` | `--p-fondo` |
| Carpeta (lateral) | `#E6D9BA` | `--p-carpeta` |
| Hoja (ficha, modales) | `#F8F4EA` | `--p-hoja` |
| Tinta / texto | `#1F1B16` | `--tinta`, `--fg` |
| Texto secundario | `#4F473D` | `--fg-dim` |
| Texto tenue | `#6B6154` | `--fg-faint` |
| Peligro / OK / Aviso | `#B3261E` / `#2E7D4F` / `#B26A00` | |

Todo el papel lleva `--grano` (ruido SVG). Sobre papel el problema es al revés
que sobre tinta: los mundos **claros** (NieR, ZZZ) no se ven, así que
`--acento-vivo` mezcla el acento con un 32 % de tinta para sellos y filetes.

## Tipografía

- **Special Elite** — rótulos: titular, nombre del personaje, títulos de sección.
- **IBM Plex Mono** — datos, claves, botones, pies de foto, migas.
- **IBM Plex Sans** — interfaz corrida (lista de mundos, textos de modal).
- **Literata** — prosa de la ficha, sobre papel pautado a 28px.

## Piezas

- **Botones:** rectángulo con borde de tinta y sombra dura desplazada (3px) del
  color del mundo; al pulsar se aplasta contra el papel.
- **Placa del riel:** foto de identificación con marco blanco, pie a máquina y
  un giro de ±1°. La seleccionada lleva cinta adhesiva del color del mundo.
- **Ficha:** hoja con pestaña superior (`data-mundo`, lo rellena `app.js`),
  foto grapada torcida, tabla de datos con renglones de puntos, sello
  «Archivado» y descripción sobre pauta.
- **Etiquetas:** cinta de rotuladora (fondo tinta, letra clara).
- **Modales:** hoja con agujeros de archivador que cae sobre la mesa.
- **Avisos:** notas amarillas con filete de estado.
- **Logo:** una sola imagen en todas partes, `logo-completo.webp` (carpeta con
  portal y sello «ARCHIVO»): esquina de la hoja de la portada y barra superior.
  La pestaña usa la misma imagen reducida (`logo-32.png`, `logo-192.png`).

## Móvil (≤860px)

El cajón de carpetas pasa a una fila de pestañas horizontales arriba; la escena
hace scroll entera y la foto va encima de la hoja. El panel de edición apila
navegación, lista y formulario.

---

# Referencia: sistema anterior «Archivo en tinta»

# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Catálogo Interdimensional
**Generated:** 2026-08-16 · **Rediseñado:** 2026-09-17
**Category:** Archivo / catálogo de consulta
**Design Dials:** Variance 6/10 (Editorial / Precise) | Motion 3/10 (Restrained) | Density 6/10 (Standard)

---

## La idea

**La casa es neutra; el mundo pone el color.**

El catálogo guarda 13 universos que no se parecen en nada. Si la interfaz se viste
de uno, miente sobre los otros doce: leer una ficha de Harry Potter dentro de una
carcasa de FNAF no tiene sentido. Así que la casa es un instrumento de archivo —
tinta, filetes, tipografía precisa — y el único color de la pantalla es el del
mundo abierto.

Ese color no se queda en una rayita. `app.js` lo inyecta en `:root` y el CSS lo
mezcla (`color-mix`) dentro de cada superficie, del halo del retrato y de los
filetes de estado: cambiar de mundo cambia la temperatura de la sala entera.

---

## Global Rules

### Color Palette

Tinta azulada, no gris neutro: un gris puro con trece acentos distintos encima
dejaba la casa apagada.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Void (barra superior) | `#06070C` | `--t-950` |
| Background | `#0B0C14` | `--t-900` |
| Surface (lateral, modales) | `#101220` | `--t-850` |
| Raised (fichas, paneles) | `#161927` | `--t-800` |
| Inset (campos, etiquetas) | `#1D2130` | `--t-750` |
| Foreground | `#E9EAF3` | `--fg` |
| Muted | `#A3A7BD` | `--fg-dim` |
| Faint | `#767B94` | `--fg-faint` |
| Border | `rgba(233,234,243,.085)` | `--line` |
| Border strong | `rgba(233,234,243,.17)` | `--line-strong` |
| Destructive | `#F2555A` | `--danger` |
| Success | `#3DD68C` | `--ok` |
| Warning | `#F6B23C` | `--warn` |
| Accent | del mundo activo | `--accent` |
| Accent neutro (portada) | `#D9DCEA` | — |

**Derivadas del acento** (se recalculan solas al cambiar de mundo):

| Variable | Fórmula | Uso |
|----------|---------|-----|
| `--sup-baja` | `color-mix(in oklab, var(--t-850) 95%, var(--accent))` | lateral, modales |
| `--sup-alta` | `color-mix(in oklab, var(--t-800) 94%, var(--accent))` | fichas, panel de detalle |
| `--sup-inset` | `color-mix(in oklab, var(--t-750) 93%, var(--accent))` | campos con foco |
| `--linea-acento` | `color-mix(in srgb, var(--accent) 34%, transparent)` | bordes de foco |
| `--halo` | `color-mix(in srgb, var(--accent) 13%, transparent)` | rescoldo bajo los retratos |
| `--acento-vivo` | `color-mix(in oklab, var(--accent) 72%, #EDEFF7 28%)` | filetes y estados |

`--acento-vivo` existe porque hay mundos de color muy oscuro (Harry Potter
`#462a0e`, Merlina `#6B1F3A`) que sobre la tinta no se veían. Los **rellenos**
siguen usando `--accent` tal cual, que ahí el contraste lo resuelve `--accent-ink`
(cada mundo declara si su color lleva texto claro u oscuro).

Todo esto va dentro de un `@supports (color: color-mix(...))`; sin soporte las
superficies se quedan en la tinta pura. Se ve más sobrio, nunca roto.

### Typography

- **Interfaz y titulares:** Archivo (variable, `wght` 400–800 · `wdth` 62–125)
- **Prosa de las fichas:** Literata (variable, `opsz` 7–72)
- **Mood:** archivo, editorial, preciso, legible, sin disfraz de género

Una sola familia sostiene toda la interfaz: el **eje de ancho** hace el trabajo
que en otro sitio harían dos tipografías. Literata entra solo donde hay texto
largo que leer de verdad —la descripción del personaje y el textarea que la
escribe—, porque una ficha es una entrada de enciclopedia, no una etiqueta.

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Literata:ital,opsz,wght@0,7..72,400..600;1,7..72,400..500&display=swap');
```

| Rol | Tamaño | Ajustes |
|-----|--------|---------|
| Display (portada) | `clamp(38px,5.4vw,72px)` | ver lockup abajo |
| Título de ficha | `clamp(26px,2.6vw,36px)` | `wdth 106`, `-.03em` |
| Título de sección | 20–21px | `wdth 110–112` |
| UI base | 14px | `wdth 100` |
| Prosa | 15.5px / 1.78 | Literata, máx. 66ch |
| Clave de dato | 10.5px | versalitas, `.11em` |

**El lockup de la portada:** las dos líneas se cuadran a la misma anchura con el
eje de ancho, no a ojo — `CATÁLOGO` a `wdth 125`/800 y `INTERDIMENSIONAL` a
`wdth 94`/500 y `.75em`. Medido con la fuente cargada. No se pinta una palabra de
otro color: el contraste es de anchura y peso.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--s1` | `4px` | Tight gaps |
| `--s2` | `8px` | Icon gaps, inline spacing |
| `--s3` | `12px` | Standard padding |
| `--s4` | `16px` | Panel padding |
| `--s5` | `24px` | Section padding |
| `--s6` | `32px` | Section margins |
| `--s7` | `48px` | Hero padding |

### Radii

Dos radios y una píldora, por jerarquía — no el mismo borde para todo:

| Token | Value | Usage |
|-------|-------|-------|
| `--r-placa` | `3px` | Fichas, celdas, etiquetas, chips. Casi recto, como la etiqueta de un ejemplar. |
| `--r-inset` | `7px` | Campos, buscadores, iconos de modal. |
| `--r-panel` | `12px` | Contenedores grandes y modales. |
| `--r-pill` | `999px` | **Solo** acciones: es lo único que se pulsa. |

---

## Component Specs

### Botones

```css
.btn{ border-radius:var(--r-pill); padding:11px 20px; font-weight:600; font-size:13.5px;
      transition:transform .18s var(--ease), box-shadow .2s, background .2s }
.btn-primario{ background:var(--accent); color:var(--accent-ink) }
.btn-primario:hover{ box-shadow:0 10px 32px -12px var(--accent) }
.btn:active{ transform:scale(.975) }
```

Sin versalitas ni tracking: el botón dice lo que hace y se lee de un golpe.

### Placa de personaje (riel)

```css
.ficha-card{ width:156px; height:222px; border-radius:var(--r-placa);
             background:var(--sup-alta); border:1px solid var(--line) }
.ficha-card::before{ background:radial-gradient(ellipse 80% 55% at 50% 88%, var(--halo), transparent 72%) }
.ficha-card:hover{ transform:translateY(-3px); border-color:var(--line-strong) }
.ficha-card.sel{ transform:translateY(-5px); border-color:var(--acento-vivo) }
```

El retrato flota sobre un rescoldo del color del mundo; la placa inferior lleva
nombre y alias sobre un degradado hasta `--t-950`.

### Tabla de datos de la ficha

Los campos son una **tabla**, no doce tarjetitas: clave a la izquierda, valor a la
derecha, un filete por fila y dos columnas cuando cabe. Se lee en vertical de un
vistazo y no fabrica doce cajas idénticas.

```css
.campos{ display:grid; grid-template-columns:repeat(auto-fill,minmax(232px,1fr));
         gap:0 var(--s6); border-top:1px solid var(--line) }
.campos .c{ display:flex; justify-content:space-between; align-items:baseline;
            padding:9px 0; border-bottom:1px solid var(--line) }
```

### Campos

```css
.campo input,.campo textarea,.campo select{
  background:var(--t-800); border:1px solid var(--line); border-radius:var(--r-inset); padding:10px 12px }
.campo :focus{ border-color:var(--linea-acento); background:var(--sup-inset) }
.campo textarea{ font-family:var(--f-lectura) }   /* se escribe como se lee */
```

### Modales

```css
.velo{ background:rgba(6,7,12,.76); backdrop-filter:blur(6px) }
.modal{ background:var(--t-850); border:1px solid var(--line-strong);
        border-radius:var(--r-panel); padding:var(--s6); box-shadow:0 40px 100px -24px #000 }
```

---

## Style Guidelines

**Style:** Archivo en tinta (dark, editorial)

**Keywords:** tinta, filete, hoja de contacto, ficha, retrato recortado, halo del
mundo, versalita de dato, prosa serif, precisión

**Key Effects:** easing `cubic-bezier(.16,1,.3,1)`; superficies mezcladas con el
acento; halo radial bajo cada retrato; máscara de degradado en los bordes del riel;
`backdrop-filter` solo en el velo de los modales.

### Page Pattern

**Pattern Name:** Portada con el contenido como argumento

- **Hero:** el muro — hoja de contacto en diagonal con retratos de verdad sacados
  de `datos.json`, un personaje por mundo antes de repetir. Nada de degradados
  ambientales ni rejillas enmascaradas: lo que vende esta página es lo que hay
  dentro.
- **Section Order:** 1. muro + lockup, 2. una frase de qué es esto, 3. la tira de
  cifras, 4. entrar.
- **CTA Placement:** al final del bloque de texto, alineado a la izquierda con él.

---

## Motion

Movimiento como **respuesta a una acción**, más un único momento ambiental.

**Cascada del riel** — Disparo: cambiar de mundo o de vista (nunca al teclear en el
buscador, que repinta a cada letra). Duración 420ms, `--ease`, 28ms por ficha con
tope de 14.

```css
.riel.entra .ficha-card{ animation:asomar .42s var(--ease) both;
                         animation-delay:calc(min(var(--i,0),14) * 28ms) }
@keyframes asomar{ from{ opacity:0; transform:translateY(10px) scale(.975) } }
```

**Muro de la portada** — el único movimiento no disparado por nadie: columnas de
retratos que van y vienen a 74–116s. Se apaga entero con `prefers-reduced-motion`.

---

## Anti-Patterns (Do NOT Use)

- ❌ Blobs de aurora + rejilla enmascarada como fondo de portada
- ❌ Doce tarjetas idénticas donde el contenido es una tabla
- ❌ El mismo radio para todo, sin jerarquía
- ❌ Versalitas con tracking encima de cada bloque de texto
- ❌ Pintar una sola palabra del titular de otro color
- ❌ `→` pegado al texto de un botón o un enlace
- ❌ Emojis como iconos — SVG del juego de iconos de `index.html`
- ❌ Falta de `cursor:pointer` en lo que se pulsa
- ❌ Cambios de estado instantáneos — transición de 150–300ms
- ❌ Foco invisible
- ❌ Accesibilidad ignorada

---

## Pre-Delivery Checklist

- [ ] Ningún emoji como icono; SVG del juego ya definido
- [ ] `cursor:pointer` en todo lo pulsable
- [ ] Hover con transición de 150–300ms
- [ ] Texto a 4.5:1 mínimo sobre su fondo real
- [ ] Foco visible con teclado
- [ ] `prefers-reduced-motion` respetado
- [ ] Probado a 390px, 860px, 1080px y 1440px, y a 700px de alto
- [ ] Sin scroll horizontal
- [ ] Probado con un mundo claro (ZZZ), uno oscuro (Harry Potter) y uno pálido (NieR)
