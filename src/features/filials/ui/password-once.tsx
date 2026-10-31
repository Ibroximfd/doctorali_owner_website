"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";

/** Yangi akkaunt paroli — backend uni faqat yaratish javobida BIR MARTA beradi (v2 §2.5). */
export const PasswordOnce = ({ username, password }: { username: string; password: string }) => {
  const t = useTranslations("filials.password");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      toast.error(t("copyFailed"));
    }
  };
  return (
    <section aria-labelledby="new-password" className="bg-warn-soft rounded-2xl border px-4 py-3">
      <h3 id="new-password" className="text-sm font-semibold">
        {t("title")}
      </h3>
      <p className="text-ink-2 mt-1 text-xs">{t("login", { username })}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="num bg-surface flex-1 rounded-lg border px-3 py-2 text-base font-semibold tracking-wide">
          {password}
        </code>
        <Button size="sm" onClick={() => void copy()}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <p className="text-ink-2 mt-2 text-xs">{t("once")}</p>
    </section>
  );
};
