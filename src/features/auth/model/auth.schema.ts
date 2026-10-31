import { z } from "zod";

import type { Camelized } from "@/shared/lib/camelize";

/** 1-qadam formasi. Login — backenddagi foydalanuvchi nomi (masalan `devtest`). Xato matnlari — `auth.errors.*`. */
export const loginInputSchema = z.object({
  username: z.string().trim().min(1, "usernameRequired"),
  password: z.string().min(1, "passwordRequired"),
});
export type LoginFormValues = z.input<typeof loginInputSchema>;
/** Backendga ketadigan: `{ username: "devtest", password }`. */
export type LoginInput = z.output<typeof loginInputSchema>;

export const CODE_LENGTH = 6;

/** 2-qadam formasi: SMS/TOTP kodi. */
export const codeInputSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "codeInvalid"),
});
export type CodeInput = z.infer<typeof codeInputSchema>;

export const challengeSchema = z.object({
  challenge_id: z.string(),
  method: z.enum(["sms", "totp"]),
  phone_masked: z.string().nullable().optional(),
});
export type Challenge = Camelized<z.infer<typeof challengeSchema>>;

export const userSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  role: z.string(),
  sections: z.array(z.string()).default([]),
  filials: z.array(z.number()).default([]),
  mask_pii: z.boolean().default(false),
  /** Ruxsatlar (`07_BACKEND_TZ_V2` §9.2) — eski backend yubormasa ham ishlaydi. */
  regions: z.array(z.string()).default([]),
  can_export: z.boolean().default(true),
  expires_at: z.string().nullable().default(null),
  granted_by: z.string().nullable().default(null),
});
export type User = Camelized<z.infer<typeof userSchema>>;

export const verifyResponseSchema = z.object({ user: userSchema });

// Yo'l tekshiruvi umumiy — `shared` da.
export { safeNextPath } from "@/shared/lib/safe-next-path";
