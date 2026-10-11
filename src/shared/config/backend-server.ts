import { resolveServer } from "../../../config/servers.mjs";

/**
 * Panel qaysi backend bilan ishlaydi. Serverlar nomi va default — `config/servers.mjs`
 * (yagona manba); vaqtincha almashtirish — `APP_SERVER=test`. `BACKEND_ORIGIN` esa
 * nomlanganlardan boshqa manzil kerak bo'lganda (lokal backend) va u ustun turadi.
 */
export type BackendServer = {
  /** `prod` / `test`, yoki `BACKEND_ORIGIN` berilganda — `custom`. */
  name: string;
  /** Terminalda va diagnostikada ko'rinadigan nom. */
  label: string;
  origin: string;
};

export const resolveBackend = ({
  origin,
  server,
}: { origin?: string | undefined; server?: string | undefined } = {}): BackendServer => {
  // Manzil faqat origin bo'lib qoladi: oxiridagi `/` kesiladi.
  if (origin) return { name: "custom", label: "Boshqa manzil", origin: origin.replace(/\/+$/, "") };

  const resolved = resolveServer(server || undefined);
  return { name: resolved.name, label: resolved.label, origin: resolved.origin };
};
