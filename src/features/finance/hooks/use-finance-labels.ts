"use client";

import { useTranslations } from "next-intl";

/**
 * Backend lug'atlari ochiq ro'yxat: yangi toifa yoki to'lov usuli kelsa ekran
 * yiqilmaydi — tarjimasi bo'lmagan qiymat o'zicha ko'rsatiladi.
 */
export const useExpenseCategoryLabel = () => {
  const t = useTranslations("finance.expenses.category");
  return (category: string): string => (t.has(category) ? t(category) : category);
};

export const usePaymentMethodLabel = () => {
  const t = useTranslations("finance.paymentMix.method");
  return (method: string): string => (t.has(method) ? t(method) : method);
};
