import { expect, type Page } from "@playwright/test";

/** Namuna rejimida kirish: istalgan login va parol (SMS bosqichi yo'q — backend kabi). */
export const signIn = async (page: Page): Promise<void> => {
  await page.goto("/login");
  await page.getByLabel("Login").fill("devtest");
  await page.getByLabel("Parol").fill("namuna-parol");
  await page.getByRole("button", { name: "Davom etish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bugungi holat" })).toBeVisible();
};

export const PANEL_PATHS = [
  "/",
  "/orders",
  "/finance",
  "/clinic",
  "/logistics",
  "/sales",
  "/app",
  "/products",
  "/customers",
  "/doctors",
  "/alerts",
  "/reports",
  "/settings",
] as const;

/** Sahifa tanasi hech qachon gorizontal aylanmasligi kerak (keng jadval o'z konteynerida aylanadi). */
export const expectNoHorizontalScroll = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "sahifa gorizontal toshib ketdi").toBeLessThanOrEqual(0);
};
