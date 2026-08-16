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
    const escala = Math.min(MAX_W / bitmap.width, MAX_H / bitmap.height, 1);
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
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
