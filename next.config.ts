import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { resolveServer } from "./config/servers.mjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Qaysi server bilan ishlayotganimiz terminalda ko'rinib turadi — noto'g'ri serverga
 * ulanib o'tirmaslik uchun (nomlar va default — `config/servers.mjs`).
 */
{
  const server = process.env.BACKEND_ORIGIN
    ? { label: "Boshqa manzil", origin: process.env.BACKEND_ORIGIN }
    : resolveServer();
  console.info(`Backend: ${server.label} — ${server.origin}`);
}

const originOf = (url: string | undefined): string => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};

/**
 * Qaysi manbalardan skript, ulanish va rasm yuklanishi mumkin. Next o'z inline
 * skriptlari va grafiklar inline uslublari uchun `unsafe-inline` kerak; begona
 * domen faqat Telegram SDK (`/tg`). Dev — HMR uchun `eval` va `ws:`.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://telegram.org${isProduction ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self' ${originOf(process.env.NEXT_PUBLIC_WS_URL)}${isProduction ? "" : " ws: wss:"}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** Moliyaviy panel: freymga joylanmaydi, manzilni tashqariga bermaydi. */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Telegramda sinash uchun dev serverga HTTPS tunnel orqali kiriladi
 * (`*.trycloudflare.com`, `*.ngrok-free.app`) — Next 16 begona originni sukut bo'yicha bloklaydi.
 */
const DEV_ALLOWED_ORIGINS = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: DEV_ALLOWED_ORIGINS,
  // BFF (cookie → Bearer proksi) Node serverni talab qiladi — statik eksport emas.
  output: "standalone",
  poweredByHeader: false,
  // Django yo'llari `/` bilan tugaydi; Next uni olib tashlasa backend 301 qaytaradi.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
