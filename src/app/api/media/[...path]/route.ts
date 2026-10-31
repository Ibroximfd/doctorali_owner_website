import { type NextRequest } from "next/server";

import { serverEnv } from "@/shared/config/env.server";
import { errorResponse } from "@/shared/lib/backend.server";

/**
 * Backend `/media/*` (mahsulot rasmlari) — o'z domenimiz orqali: CSP `img-src 'self'` begona
 * hostdan rasmni bloklaydi, nisbiy `/media/…` esa panel hostiga ketib, 404 bo'ladi. Faqat rasm
 * turlari (SVG yo'q — o'z domenimizda skript bo'lib ochilmasin), faqat GET; token yuborilmaydi.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

const SAFE_SEGMENT = /^[\w.~%-]+$/;
const DOT_SEGMENT = /^\.+$/;
const IMAGE_TYPE = /^image\/(png|jpe?g|webp|gif|avif)$/;
const DAY_SECONDS = 86_400;

export const GET = async (_request: NextRequest, { params }: RouteContext): Promise<Response> => {
  if (serverEnv.isDemo) return errorResponse(404, "not_found");
  const { path } = await params;
  if (!path.every((segment) => SAFE_SEGMENT.test(segment) && !DOT_SEGMENT.test(segment)))
    return errorResponse(400, "invalid_path");

  const upstream = await fetch(`${serverEnv.backendOrigin}/media/${path.join("/")}`, {
    cache: "no-store",
  }).catch(() => null);
  const type = upstream?.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!upstream?.ok || !IMAGE_TYPE.test(type)) return errorResponse(404, "not_found");

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": `private, max-age=${DAY_SECONDS}`,
      "x-content-type-options": "nosniff",
    },
  });
};

export const dynamic = "force-dynamic";
