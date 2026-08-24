import type { ClipboardEvent } from "react";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

export async function pastedCoverAsJpeg(event: ClipboardEvent<HTMLElement>): Promise<number[] | null> {
  const item = Array.from(event.clipboardData.items).find((candidate) =>
    candidate.type.startsWith("image/"),
  );
  const file = item?.getAsFile();
  if (!file) return null;
  event.preventDefault();
  if (file.size > MAX_COVER_BYTES) throw new Error("La imagen supera el máximo de 8 MB.");

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("No se pudo convertir la imagen a JPEG.")),
        "image/jpeg",
        0.9,
      ),
    );
    if (blob.size > MAX_COVER_BYTES) throw new Error("La portada convertida supera el máximo de 8 MB.");
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  } finally {
    bitmap.close();
  }
}
