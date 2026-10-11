import { parseJson } from "@/shared/lib/envelope";
import { authSend } from "@/shared/lib/http";

import { telegramSignInSchema, telegramStatusSchema, type TelegramStatus } from "../model/telegram.schema";

type PinInput = { initData: string; pin: string };

/** Mini app ochilishi: holat so'raladi (server shu paytda oldingi sessiyani yopadi). */
export const loadTelegramStatus = async (initData: string): Promise<TelegramStatus> =>
  parseJson(telegramStatusSchema, await authSend("telegram/status", { init_data: initData }));

export const signInWithPin = async ({ initData, pin }: PinInput): Promise<void> => {
  parseJson(telegramSignInSchema, await authSend("telegram/login", { init_data: initData, pin }));
};

/** Parol + SMS dan keyin: akkauntni bog'lash va PIN o'rnatish (so'ng darhol kiriladi). */
export const linkTelegram = async ({ initData, pin }: PinInput): Promise<void> => {
  parseJson(telegramSignInSchema, await authSend("telegram/link", { init_data: initData, pin }));
};
