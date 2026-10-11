import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** `POST /api/auth/telegram/status` (`doctor_ali_owner_bot/docs/02_BACKEND_TZ.md` §3.1). */
export const telegramStatusSchema = z.object({
  state: z.enum(["unlinked", "pin_required", "locked"]),
  full_name: z.string().nullable(),
  attempts_left: z.number().int().nullable(),
  locked_until: z.string().nullable(),
});
export type TelegramStatus = Camelized<z.infer<typeof telegramStatusSchema>>;

/** Kirish/bog'lash javobi: token cookie da qoladi, brauzerga faqat foydalanuvchi keladi. */
export const telegramSignInSchema = z.object({ user: z.object({ full_name: z.string() }).passthrough() });
