# Catálogo Interdimensional

- Trabajar siempre directamente en `main`: no crear ramas ni pull requests.
  GitHub Pages publica `main`, así que cada push queda en la web.
- La lógica (`js/github.js`, `js/config.js`, `js/imagen.js`, `js/favoritos.js`)
  no se toca en cambios visuales. El sistema visual está en `design-system/MASTER.md`.
- `datos.json` se escribe con `json.dumps(ensure_ascii=False, indent=1)`, sin salto
  de línea final, y los personajes van ordenados por `mundo` y luego `nombre`
  (la comparación simple de `compararPersonajes` en `js/app.js`).
