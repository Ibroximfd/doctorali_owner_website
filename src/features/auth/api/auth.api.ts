import { z } from "zod";

import { parseJson } from "@/shared/lib/envelope";
import { apiGet, authSend } from "@/shared/lib/http";

import {
  challengeSchema,
  userSchema,
  verifyResponseSchema,
  type Challenge,
  type LoginInput,
  type User,
} from "../model/auth.schema";

export type SignInResult = { kind: "signed-in"; user: User } | { kind: "challenge"; challenge: Challenge };

/**
 * Login + parol. Hozirgi backend SMS bosqichisiz darhol kiritadi (sessiya BFF da
 * yoziladi, javobda `user`); SMS/TOTP yoqilsa — `challenge` qaytadi va kod so'raladi.
 */
export const requestChallenge = async (input: LoginInput): Promise<SignInResult> => {
  const result = parseJson(z.union([verifyResponseSchema, challengeSchema]), await authSend("login", input));
  return "user" in result
    ? { kind: "signed-in", user: result.user }
    : { kind: "challenge", challenge: result };
};

/** 2-qadam: kod to'g'ri bo'lsa sessiya cookie o'rnatiladi (BFF da). */
export const verifyCode = async (input: { challengeId: string; code: string }): Promise<User> =>
  parseJson(
    verifyResponseSchema,
    await authSend("verify", { challenge_id: input.challengeId, code: input.code }),
  ).user;

export const logout = async (): Promise<void> => {
  await authSend("logout");
};

export const loadMe = async (): Promise<User> => parseJson(userSchema, await apiGet("me/"));
