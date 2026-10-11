"use client";

import { LoginForm } from "@/features/auth/ui/login-form";
import { TelegramEntry } from "@/features/telegram/ui/telegram-entry";
import { OfflineBanner } from "@/shared/ui/states";

/** Kompozitsiya: Telegram oqimi bog'lash qadamida `auth` dagi parol + SMS formasidan foydalanadi. */
export const TelegramEntryScreen = ({ next }: { next?: string }) => (
  <div className="flex w-full flex-col items-center gap-3">
    <OfflineBanner className="w-full max-w-100" />
    <TelegramEntry next={next} renderSignIn={(onSignedIn) => <LoginForm onSignedIn={onSignedIn} />} />
  </div>
);
