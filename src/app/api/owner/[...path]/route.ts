import { createProxy } from "@/shared/lib/bff-proxy.server";

/** BFF `/api/owner/*` — `createProxy` ga qarang. */
const handle = createProxy("/api/owner/");

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

/** Har so'rov cookie ga bog'liq — hech qachon oldindan render qilinmaydi. */
export const dynamic = "force-dynamic";
