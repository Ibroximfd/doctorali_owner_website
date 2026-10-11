/**
 * Serverlar — butun loyiha uchun yagona manba.
 *
 * Bu yerdagi host quyidagilarning hammasini boshqaradi:
 *   • BFF (`/api/owner/*`) qaysi backendga boradi (`src/shared/config/env.server.ts`);
 *   • `npm run backend:login` va `npm run contract:check` qaysi serverni tekshiradi;
 *   • `next dev` / `next build` boshida terminalda ko'rinadigan server nomi;
 *   • deploy hujjatidagi loopback port (`docs/DEPLOY.md`).
 *
 * Oddiy `.mjs` — chunki uni ham Node skriptlari, ham `next.config.ts`, ham ilova o'qiydi.
 * Tiplari yonidagi `servers.d.mts` da.
 */

/**
 * `host` — backend hosti: panel BFF shu manzil bilan gaplashadi (brauzer ko'rmaydi).
 *
 * `port` — panelning loopback porti. Bir serverda test va prod yonma-yon tursa
 * to'qnashmasin; tashqariga baribir faqat nginx chiqaradi.
 */
export const SERVERS = {
  test: {
    host: "imorganic.uz",
    label: "Test",
    port: 3001,
  },
  prod: {
    host: "my.imorganic.uz",
    label: "Production",
    port: 3000,
  },
};

/**
 * ⬇︎ SERVERNI ALMASHTIRISH UCHUN FAQAT SHU QATORNI O'ZGARTIRING.
 *
 * Vaqtincha almashtirish uchun esa `APP_SERVER` yetarli, faylga tegmasdan:
 *   APP_SERVER=test npm run dev
 *   APP_SERVER=test npm run backend:login
 */
export const DEFAULT_SERVER = "prod";

/** Nomi bo'yicha serverni beradi; noto'g'ri nom jimgina o'tib ketmaydi. */
export function resolveServer(name = process.env.APP_SERVER || DEFAULT_SERVER) {
  const server = SERVERS[name];

  if (!server) {
    const known = Object.keys(SERVERS).join(", ");
    throw new Error(`Noma'lum server: "${name}". Mavjudlari: ${known}.`);
  }

  return { name, origin: `https://${server.host}`, ...server };
}
