# Guía para editar el catálogo

Esto es todo lo que necesitas. Se hace una vez y ya.

## 1. Acepta la invitación

Te llegará por correo una invitación a colaborar en el repositorio. Acéptala. Sin eso, nada
de lo demás funciona.

## 2. Crea tu token

Un token es tu llave personal. **No se comparte con nadie**, ni siquiera con el dueño del
repositorio: cada uno tiene el suyo, y así el historial refleja quién metió cada cosa.

Como el repositorio pertenece a una cuenta personal que no es la tuya, tiene que ser un token
**clásico**. Los llamados "finos" no pueden apuntar al repositorio de otra persona: cuando fueras
a crearlo, su cuenta ni siquiera aparecería en la lista. Es una limitación de GitHub, no un
permiso que falte por dar.

1. Entra en <https://github.com/settings/tokens/new>
2. **Note**: `catalogo` (o lo que quieras).
3. **Expiration**: 90 días está bien. Cuando caduque, repites estos pasos.
4. **Select scopes**: marca **solo** la casilla `public_repo`.

   No marques `repo`. Esa da acceso también a todos tus repositorios **privados**, y aquí no
   hace ninguna falta: `public_repo` se limita a los públicos y con eso basta.
5. **Generate token** y **copia el texto que empieza por `ghp_`**. Solo se muestra una vez;
   si lo pierdes, generas otro.

## 3. Entra en la web

Abre el catálogo, pulsa **Acceso de editor** abajo a la izquierda, pega el token y entra.
Se guarda en ese navegador, así que solo lo haces una vez por ordenador.

## 4. A trabajar

**Crear un mundo**: pestaña *Mundos* → *Nuevo mundo*. Ponle nombre y un color; ese color
tiñe toda la interfaz cuando el mundo está seleccionado.

**Crear un personaje**: pestaña *Personajes* → *Nuevo personaje*, o el recuadro con el `+`
al final del carrusel. Elige el mundo al que pertenece y rellena lo que sepas: los campos
vacíos simplemente no se muestran en la ficha.

**El retrato**: arrastra la imagen al recuadro de la izquierda. Se recorta y se convierte
sola, no te preocupes por el tamaño. Van mejor los PNG con fondo transparente.

**El punto naranja** junto a un personaje significa que aún no tiene descripción. Arriba
del todo se ve cuántos quedan.

## 5. Publica

Nada de lo que hagas se guarda hasta que pulses **Publicar cambios**. Puedes editar veinte
personajes y publicarlos todos de una vez.

Tras publicar, la web tarda menos de un minuto en actualizarse.

## Si algo va mal

**«El token es válido pero no llega a este repositorio»** — casi siempre es que creaste un token
fino en vez de uno clásico. Vuelve al paso 2.

**«El token no es válido o ha caducado»** — genera uno nuevo y vuelve a pegarlo.

**«Alguien más ha publicado cambios mientras editabas»** — la otra persona publicó primero.
Recarga la página y vuelve a meter lo tuyo. Es molesto pero evita que os piséis el trabajo,
así que conviene avisaros cuando vayáis a hacer tandas largas.

**Cerraste la pestaña sin publicar** — se pierde lo no publicado. El navegador avisa antes
de cerrar, pero conviene publicar a menudo.

## Sobre la seguridad de tu token

`public_repo` no toca ninguno de tus repositorios privados. Lo único que podría hacer alguien
con tu token si te lo robaran es escribir en tus repositorios **públicos**. Si eso te preocupa,
puedes borrarlo en cualquier momento desde <https://github.com/settings/tokens> y crear otro.
