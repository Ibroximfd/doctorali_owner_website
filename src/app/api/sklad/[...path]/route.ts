import { createProxy } from "@/shared/lib/bff-proxy.server";

/**
 * BFF `/api/sklad/*` — owner tokeni sklad API ga ham kiradi (v2 §2.10): sklad ekranlari
 * logist saytidagi bilan bir xil API dan chiziladi.
 */
const handle = createProxy("/api/sklad/");

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

export const dynamic = "force-dynamic";
