/**
 * Backendga (parol + SMS) kirib, sessiyani shartnoma tekshiruvi uchun saqlaydi.
 * Login, parol va kod faqat shu terminalda kiritiladi, ekranda parol ko'rinmaydi.
 * Saqlanadigan narsa — faqat tokenlar (lokal fayl).
 *
 * Xato bo'lsa — to'liq jurnal (so'rov va javob tanasi, sarlavhalar, vaqt) ekranga
 * chiqadi va `backend-login-error.log` ga yoziladi: backend jamoasiga yuborish uchun.
 * Jurnalda parol o'rnida faqat uning belgilari (uzunligi, bo'sh joy, kirill harfi).
 *
 *   npm run backend:login                       # `config/servers.mjs` dagi server
 *   APP_SERVER=test npm run backend:login       # vaqtincha boshqa server
 *   BACKEND_ORIGIN=https://… npm run backend:login
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { resolveBackend } from "../src/shared/config/backend-server";

import { SESSION_FILE, saveSession } from "./contract/session";

const backend = resolveBackend({ origin: process.env.BACKEND_ORIGIN });
const origin = backend.origin;
const LOG_FILE = join(process.cwd(), "backend-login-error.log");
const REQUEST_HEADERS = { "content-type": "application/json", accept: "application/json" };

const ask = (question: string, hidden = false): Promise<string> =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Kiritilgan belgilar ekranga chiqmaydi.
      const output = rl as unknown as { _writeToOutput: (text: string) => void };
      output._writeToOutput = (text: string) => {
        if (text.includes(question)) process.stdout.write(text);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      // Parol qirqilmaydi — bo'sh joy ham uning bir qismi bo'lishi mumkin.
      resolve(hidden ? answer : answer.trim());
    });
  });

type Exchange = {
  url: string;
  sentAt: string;
  durationMs: number;
  status: number;
  responseHeaders: Record<string, string>;
  rawBody: string;
  json: Record<string, unknown>;
};

const post = async (path: string, body: unknown): Promise<Exchange> => {
  const url = new URL(path, origin).toString();
  const sentAt = new Date().toISOString();
  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: REQUEST_HEADERS,
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const rawBody = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    // JSON emas — xom matn jurnalda ko'rinadi.
  }
  return {
    url,
    sentAt,
    durationMs: Date.now() - started,
    status: response.status,
    responseHeaders: Object.fromEntries(response.headers.entries()),
    rawBody,
    json,
  };
};

/** Sirning o'zi emas — backendga tushuntirish uchun belgilari. */
const describeSecret = (secret: string) => ({
  length: secret.length,
  leading_or_trailing_space: secret !== secret.trim(),
  non_ascii_chars: [...secret].filter((char) => (char.codePointAt(0) ?? 0) > 127).length,
  cyrillic_chars: [...secret].filter((char) => /[Ѐ-ӿ]/.test(char)).length,
  has_digit: /\d/.test(secret),
  has_upper: /[A-Z]/.test(secret),
  has_lower: /[a-z]/.test(secret),
});

/** Jurnalga token tushmasin: `access`/`refresh` qiymati o'rniga faqat uzunligi. */
const redactTokens = (body: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body).map(([key, value]) =>
      (key === "access" || key === "refresh") && typeof value === "string"
        ? [key, `<yashirildi: ${value.length} belgi>`]
        : [key, value],
    ),
  );

const fail = (step: string, exchange: Exchange, sentBody: Record<string, unknown>): never => {
  const log = {
    step,
    sent_at: exchange.sentAt,
    duration_ms: exchange.durationMs,
    request: { method: "POST", url: exchange.url, headers: REQUEST_HEADERS, body: sentBody },
    response: {
      status: exchange.status,
      headers: exchange.responseHeaders,
      body: Object.keys(exchange.json).length > 0 ? redactTokens(exchange.json) : exchange.rawBody,
    },
  };
  const text = JSON.stringify(log, null, 2);
  writeFileSync(LOG_FILE, `${text}\n`);
  console.error(`✗ ${step}: HTTP ${exchange.status} ${String(exchange.json.code ?? "")}`);
  console.error(`\n——— JURNAL (backendga yuborish uchun) ———\n${text}`);
  console.error(`\nFaylga yozildi: ${LOG_FILE} — parol yo'q, faqat uning belgilari.`);
  process.exit(1);
};

const main = async () => {
  console.log(`Backend: ${backend.label} — ${origin}`);
  const username = await ask("Login: ");
  const password = await ask("Parol: ", true);

  const challenge = await post("/api/owner/login/", { username, password });

  // Hozirgi backend SMS bosqichisiz: tokenlar darhol keladi.
  const direct = challenge.json;
  if (challenge.status === 200 && typeof direct.access === "string" && typeof direct.refresh === "string") {
    saveSession({ origin, access: direct.access, refresh: direct.refresh });
    console.log(`✓ Kirildi (SMSsiz). Sessiya saqlandi: ${SESSION_FILE} (14 kun, gitga tushmaydi)`);
    console.log("Endi: npm run contract:check -- --full");
    return;
  }

  if (challenge.status !== 200 || typeof challenge.json.challenge_id !== "string")
    fail("1-qadam: POST /api/owner/login/", challenge, { username, password: describeSecret(password) });

  const where =
    challenge.json.method === "totp"
      ? "autentifikator ilovasidagi"
      : `SMS (${String(challenge.json.phone_masked ?? "")})`;
  const code = await ask(`${where} kod: `);

  const verified = await post("/api/owner/login/verify/", {
    challenge_id: challenge.json.challenge_id,
    code,
  });
  const { access, refresh } = verified.json;
  if (verified.status !== 200 || typeof access !== "string" || typeof refresh !== "string")
    fail("2-qadam: POST /api/owner/login/verify/", verified, {
      challenge_id: challenge.json.challenge_id,
      code: describeSecret(code),
    });

  saveSession({ origin, access: access as string, refresh: refresh as string });
  console.log(`✓ Kirildi. Sessiya saqlandi: ${SESSION_FILE} (14 kun, gitga tushmaydi)`);
  console.log("Endi: npm run contract:check -- --full");
};

void main();
