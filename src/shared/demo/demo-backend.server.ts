import "server-only";

import { DEMO_CREDENTIALS } from "../../../config/servers.mjs";

import { resolveMock } from "@/shared/testing/fixtures/registry";

import { buildAttachmentFile, buildReportFile, type DemoFile } from "./demo-files";

/**
 * Demo rejimdagi "backend": BFF `backendFetch` o'rniga shu yerga keladi va javob
 * tarmoqsiz, ichki namuna bazadan qaytadi (`src/shared/testing/fixtures`). Javob
 * shakllari shartnomaga aynan mos — ekranlar haqiqiy backenddagidek ishlaydi.
 * Holat (ko'rildi, ruxsatlar, AI suhbatlari, eksportlar) server xotirasida turadi.
 */

type DemoInit = { method?: string; body?: unknown; search?: string };

const OWNER_PREFIX = "/api/owner/";
const DEMO_TOKENS = { access: "demo-access", refresh: "demo-refresh" } as const;

/** Javob juda oniy bo'lsa skeleton "miltillaydi" — tabiiy, sezilmas kechikish. */
const LATENCY_MIN_MS = 60;
const LATENCY_SPAN_MS = 120;

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const fileResponse = ({ name, type, bytes }: DemoFile): Response =>
  new Response(new Blob([bytes as BlobPart], { type }), {
    headers: {
      "content-type": type,
      "content-length": String(bytes.length),
      "content-disposition": `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const currentUser = (now: Date): unknown =>
  resolveMock({ method: "GET", path: "me/", searchParams: new URLSearchParams(), now }).json;

const login = (body: unknown, now: Date): Response => {
  const username = isRecord(body) && typeof body.username === "string" ? body.username.trim() : "";
  const password = isRecord(body) && typeof body.password === "string" ? body.password : "";
  if (username !== DEMO_CREDENTIALS.username || password !== DEMO_CREDENTIALS.password)
    return json({ code: "invalid_credentials", detail: "invalid_credentials" }, 401);
  return json({ ...DEMO_TOKENS, user: currentUser(now) });
};

/** Eksport qilingan hisobot: turi va formati eksport tarixidan olinadi. */
const reportFile = (jobId: string, now: Date): Response => {
  const history = resolveMock({
    method: "GET",
    path: "reports/exports/",
    searchParams: new URLSearchParams(),
    now,
  });
  const jobs = isRecord(history.json) && Array.isArray(history.json.results) ? history.json.results : [];
  const job = jobs.find((item): item is Record<string, unknown> => isRecord(item) && item.job_id === jobId);
  if (!job) return json({ code: "export_not_found", detail: "export_not_found" }, 404);
  return fileResponse(buildReportFile(String(job.report), String(job.format), now));
};

const REPORT_FILE = /^reports\/export\/([\w.-]+)\/file\/$/;
const ATTACHMENT_FILE = /^ai\/attachments\/(\d+)\/file\/$/;

const ownerRequest = (
  relative: string,
  { method = "GET", body, search = "" }: DemoInit,
  now: Date,
): Response => {
  if (method === "GET") {
    const report = REPORT_FILE.exec(relative);
    if (report?.[1]) return reportFile(report[1], now);
    const attachment = ATTACHMENT_FILE.exec(relative);
    if (attachment?.[1]) return fileResponse(buildAttachmentFile(Number(attachment[1]), now));
  }
  const response = resolveMock({
    method,
    path: relative,
    searchParams: new URLSearchParams(search),
    body,
    now,
  });
  return response.status === 204 ? new Response(null, { status: 204 }) : json(response.json, response.status);
};

const route = (path: string, init: DemoInit, now: Date): Response => {
  switch (path) {
    case "/api/owner/login/":
      return login(init.body, now);
    case "/api/owner/login/verify/":
      // Demo kirishda SMS bosqichi yo'q.
      return json({ code: "challenge_expired", detail: "challenge_expired" }, 400);
    case "/api/user/refresh/":
      return json(DEMO_TOKENS);
    case "/api/owner/logout/":
      return json({ ok: true });
    case "/api/owner/ws-ticket/":
      // Jonli kanal yo'q — lenta so'rov bilan yangilanadi.
      return json({ code: "not_found", detail: "not_found" }, 404);
  }
  if (!path.startsWith(OWNER_PREFIX)) return json({ code: "not_found", detail: "not_found" }, 404);
  return ownerRequest(path.slice(OWNER_PREFIX.length), init, now);
};

export const demoFetch = async (path: string, init: DemoInit = {}): Promise<Response> => {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MIN_MS + Math.random() * LATENCY_SPAN_MS));
  try {
    return route(path, init, new Date());
  } catch (error) {
    console.error("[demo]", path, error);
    return json({ code: "server_error", detail: "server_error" }, 500);
  }
};
