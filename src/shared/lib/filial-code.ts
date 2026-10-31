/**
 * Filial belgisi (B-3): `code` bo'lsa o'zi; bo'sh yoki yo'q bo'lsa — nomining oxirgi so'zidan ikki
 * harf. Haqiqiy nomlar bir xil boshlanadi («Mehrigiyo Toshkent», «Mehrigiyo Qo'qon») — boshidan
 * olinsa hammasi «ME» bo'lib qoladi.
 */
export const shortFilialCode = (filial: { code?: string | null; name: string }): string => {
  const code = filial.code?.trim();
  if (code) return code;
  const word = filial.name.trim().split(/\s+/).at(-1) ?? "";
  return word
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 2)
    .toUpperCase();
};
