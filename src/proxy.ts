import { NextResponse, type NextRequest } from "next/server";

import { TELEGRAM_ENTRY, routes } from "@/shared/config/routes";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/shared/config/session";

/**
 * Sahifa chizilishidan oldingi kirish nazorati. Bu faqat yo'naltirish:
 * haqiqiy tekshiruv BFF da (`/api/owner/*` cookie siz 401 qaytaradi), shuning
 * uchun soxta cookie hech qanday ma'lumot bermaydi.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  // Telegram kirish nuqtasi o'zi sessiyani yopadi va PIN so'raydi — yo'naltirilmaydi.
  if (pathname === TELEGRAM_ENTRY) return NextResponse.next();

  if (pathname === routes.login) {
    return hasSession ? NextResponse.redirect(new URL(routes.overview, request.url)) : NextResponse.next();
  }
  if (hasSession) return NextResponse.next();

  const login = new URL(routes.login, request.url);
  // Kirgandan keyin shu sahifaga qaytish uchun.
  if (pathname !== routes.overview) login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // API (o'zi 401 qaytaradi), Next ichki fayllari va statik fayllardan tashqari hamma yo'l.
  // Logo va ikonlar kirish sahifasida ham (sessiyasiz) ochilishi kerak.
  matcher: [
    "/((?!api|_next/static|_next/image|brand/|favicon.ico|favicon-32.png|apple-icon.png|manifest.webmanifest).*)",
  ],
};
