/* Procesado de retratos en el navegador: redimensiona y convierte a WebP
   antes de subir, para que el repositorio no engorde. */
const IMG = (() => {
  const MAX_W = 600, MAX_H = 800, CALIDAD = 0.82, LIMITE_ENTRADA = 25 * 1024 * 1024;

  async function procesar(archivo) {
    if (!archivo.type.startsWith("image/")) {
      throw new Error("Eso no es una imagen.");
    }
    if (archivo.size > LIMITE_ENTRADA) {
      throw new Error("La imagen pesa más de 25 MB. Redúcela antes de subirla.");
    }

    const bitmap = await createImageBitmap(archivo);

    // Recorta el hueco transparente que rodea al personaje. Sin esto, un
    // retrato con mucho margen sale diminuto en la ficha, porque `contain`
    // ajusta el lienzo entero y no la figura.
    const caja = recorteVisible(bitmap);
    const escala = Math.min(MAX_W / caja.w, MAX_H / caja.h, 1);
    const ancho = Math.max(1, Math.round(caja.w * escala));
    const alto = Math.max(1, Math.round(caja.h * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, caja.x, caja.y, caja.w, caja.h, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob = await new Promise((res, rej) =>
      lienzo.toBlob(b => (b ? res(b) : rej(new Error("No se pudo convertir la imagen."))), "image/webp", CALIDAD)
    );

    return {
      base64: await aBase64(blob),
      urlPrevia: URL.createObjectURL(blob),
      bytes: blob.size,
      ancho,
      alto,
    };
  }

  /* Caja de los píxeles visibles. Se busca sobre una miniatura de 200 px para
     que una imagen de 4000×4000 no cueste medio segundo, y luego se traduce a
     las coordenadas del original con holgura de sobra para no cortar nada.
     Si la imagen es opaca (un JPG, por ejemplo) la caja es la imagen entera y
     no se recorta nada. */
  function recorteVisible(bitmap) {
    const N = 200;
    const k = Math.min(N / bitmap.width, N / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * k));
    const h = Math.max(1, Math.round(bitmap.height * k));

    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;

    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (d[(py * w + px) * 4 + 3] > 12) {
          if (px < x0) x0 = px;
          if (px > x1) x1 = px;
          if (py < y0) y0 = py;
          if (py > y1) y1 = py;
        }
      }
    }
    const entera = { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
    if (x1 < 0) return entera;                       // todo transparente

    const ex = bitmap.width / w, ey = bitmap.height / h;
    const holguraX = ex + (x1 - x0 + 1) * ex * 0.02; // un píxel de la miniatura + 2%
    const holguraY = ey + (y1 - y0 + 1) * ey * 0.02;
    const X0 = Math.max(0, Math.floor(x0 * ex - holguraX));
    const Y0 = Math.max(0, Math.floor(y0 * ey - holguraY));
    const X1 = Math.min(bitmap.width, Math.ceil((x1 + 1) * ex + holguraX));
    const Y1 = Math.min(bitmap.height, Math.ceil((y1 + 1) * ey + holguraY));
    return (X1 - X0 < 2 || Y1 - Y0 < 2) ? entera : { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 };
  }

  function aBase64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error("No se pudo leer la imagen."));
      fr.onload = () => res(String(fr.result).split(",")[1]);
      fr.readAsDataURL(blob);
    });
  }

  const pesoLegible = b => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

  return { procesar, pesoLegible };
})();
