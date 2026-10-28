/**
 * Panel orqa foni: yalpiz, tilla va moviy «aurora» nuri hamda yuqorida xira to'r.
 * Hammasi statik (animatsiya va `filter` yo'q) — aylantirish va animatsiyali
 * bloklar ostida qayta chizilmaydi. Ranglar `globals.css` dagi `ambient-glow` da.
 */
export const AmbientBackground = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="ambient-glow absolute inset-0" />
    <div className="grid-lines fade-mask-top absolute inset-0 opacity-60" />
  </div>
);
