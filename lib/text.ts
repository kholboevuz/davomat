// Qidiruv uchun matnni normallashtirish: o‘, o', oʻ, g‘ ... hammasi bir xil bo'ladi
export function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[‘’ʻʼ`´']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
