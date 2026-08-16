# Catálogo Interdimensional

Colección de personajes de ficción — Marvel, DC, Five Nights at Freddy's, Zenless Zone Zero,
NieR: Automata y los universos que se vayan añadiendo.

Es un sitio estático servido por GitHub Pages. No hay servidor ni base de datos: el contenido
vive en `datos.json` y en `imagenes/`, y el panel de edición escribe directamente en este
repositorio a través de la API de GitHub.

## Puesta en marcha

1. Crear el repositorio `catalogo-interdimensional`, **público**, y subir estos archivos.
2. **Settings → Pages** → *Deploy from a branch* → `main` → `/ (root)`.
3. **Settings → Collaborators** → añadir a quien vaya a editar.
4. Cada editor crea su propio token. Ver [GUIA-EDITOR.md](GUIA-EDITOR.md).

La web queda en `https://<usuario>.github.io/catalogo-interdimensional/`.

### Sobre los tokens

Hay dos tipos y **no son intercambiables**:

- **El dueño del repositorio** usa un token *fino*: *Only select repositories* → este repo,
  y permiso `Contents: Read and write`.
- **Los colaboradores** tienen que usar un token *clásico* con el ámbito `public_repo`. Los
  tokens finos no pueden apuntar a un repositorio de la cuenta personal de otra persona —
  es una limitación reconocida por GitHub, no un permiso que falte por conceder.

`public_repo` se limita a repositorios públicos, así que el token de un colaborador nunca
alcanza sus repositorios privados. Retirar a alguien de *Collaborators* le corta el acceso al
instante, tenga el token que tenga.

Si en el futuro entran más editores, o alguno prefiere que su token no alcance ninguno de sus
otros repositorios, mover esto a una organización gratuita permite que todos usen tokens finos
limitados a este único repositorio. El código funciona igual: `js/config.js` deduce el
propietario de la URL, sea cuenta u organización.

## Cómo se edita

Se entra por *Acceso de editor*, se pega el token una vez (queda guardado en ese navegador) y
ya se pueden crear mundos, crear personajes, rellenar fichas y arrastrar retratos.

Los cambios son locales hasta pulsar **Publicar cambios**. Al publicar se crea **un solo commit**
con `datos.json` y todas las imágenes nuevas juntas, así que el historial es legible y se puede
revertir de una pieza. GitHub Pages tarda menos de un minuto en reflejarlo.

Si dos personas editan a la vez, quien publique segundo recibe un aviso de conflicto y se le pide
recargar en lugar de pisar el trabajo del otro.

## Estructura

```
index.html            una sola página con las tres pantallas
css/estilos.css       tokens de diseño y componentes
js/config.js          repositorio (se deduce de la URL) y campos de la ficha
js/imagen.js          redimensionado y conversión a WebP en el navegador
js/github.js          lectura y publicación vía API de GitHub
js/app.js             estado compartido y explorador
js/admin.js           panel de edición y publicación
datos.json            mundos y personajes
imagenes/             retratos en WebP
```

Cada mundo lleva su propio color, y toda la interfaz se tiñe con él al seleccionarlo. Para añadir
un campo nuevo a todas las fichas basta con meterlo en `CAMPOS_FICHA` (`js/config.js`): aparece
solo en el formulario y en el detalle.

Los retratos se convierten a WebP de 600×800 en el navegador antes de subirse. Los 100 originales
de FNAF pasaron de 43,3 MB a 1,1 MB con ese proceso.

## Sobre el material

Proyecto personal sin ánimo de lucro. Los personajes y las imágenes pertenecen a sus respectivos
propietarios: Marvel, DC Comics, Scott Cawthon y Steel Wool Studios, HoYoverse, Square Enix y
demás. No hay afiliación con ninguno de ellos. Si algún titular de derechos quiere que se retire
algún material, se retira.
