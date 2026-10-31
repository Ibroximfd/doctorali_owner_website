/**
 * Ilovaning yagona xato lug'ati. UI `kind` bo'yicha tarmoqlanadi — hech qachon
 * HTTP status kodiga qarab emas.
 */
export type AppErrorKind =
  | "offline"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "validation"
  | "rate-limited"
  | "server"
  | "contract"
  | "unknown";

export class AppError extends Error {
  constructor(
    readonly kind: AppErrorKind,
    message?: string,
    /** Backend `{code}` maydoni (`section_forbidden`, `invalid_period` …). */
    readonly code?: string,
    /** Backend `{fields}` (v2 xato kelishuvi): `grant_conflict` → `{filial: 1}` va h.k. */
    readonly fields: Readonly<Record<string, unknown>> = {},
  ) {
    super(message ?? kind);
    this.name = "AppError";
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

/** Klient eslab qolgan, backendda hali yoqilmagan endpoint. */
export const ENDPOINT_MISSING = "endpoint_missing";

/**
 * Yo'l backendda umuman yo'q (BFF Django HTML 404 ni `backend_error` ga aylantiradi)
 * yoki shunday deb eslab qolingan — bu xato emas, bo'lim hali ulanmagan.
 */
export const isMissingEndpoint = (error: AppError): boolean =>
  error.kind === "not-found" && (error.code === ENDPOINT_MISSING || error.code === "backend_error");

export const kindFromStatus = (status: number | undefined): AppErrorKind => {
  if (status === undefined) return "offline";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server";
  return "unknown";
};

/** Har qanday otilgan qiymatni `AppError` ga keltiradi (UI faqat shuni ko'radi). */
export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) return error;
  if (error instanceof Error && error.name === "ZodError") return new AppError("contract", error.message);
  if (error instanceof TypeError) return new AppError("offline", error.message);
  return new AppError("unknown", error instanceof Error ? error.message : undefined);
};
