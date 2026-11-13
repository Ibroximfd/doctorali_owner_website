/** Brauzerda yaratilgan faylni yuklab olish (Excel, CSV): vaqtinchalik havola orqali. */
export const downloadBytes = (bytes: Uint8Array, mime: string, fileName: string): void => {
  // `slice` — `SharedArrayBuffer` emas, oddiy `ArrayBuffer` bo'lsin (Blob talabi)
  const blob = new Blob([bytes.slice().buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Safari yuklashni keyinroq boshlaydi — havola darhol bekor qilinmaydi
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
