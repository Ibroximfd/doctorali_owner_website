import { expect, type Page } from "@playwright/test";

/** Test backendga kirish: akkaunt muhitdan (`E2E_USERNAME`, `E2E_PASSWORD`) — kodda saqlanmaydi. */
export const e2eCredentials = (): { username: string; password: string } => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) throw new Error("E2E_USERNAME va E2E_PASSWORD kerak (test backend akkaunti).");
  return { username, password };
};

export const signIn = async (page: Page): Promise<void> => {
  await page.goto("/login");
  const { username, password } = e2eCredentials();
  await page.getByLabel("Login").fill(username);
  await page.getByLabel("Parol").fill(password);
  await page.getByRole("button", { name: "Davom etish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Umumiy holat/ })).toBeVisible();
};

export const PANEL_PATHS = [
  "/",
  "/filials",
  "/finance",
  "/analytics",
  "/staff",
  "/warehouse",
  "/ai",
  "/settings",
] as const;

/** Sahifa tanasi hech qachon gorizontal aylanmasligi kerak (keng jadval o'z konteynerida aylanadi). */
export const expectNoHorizontalScroll = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "sahifa gorizontal toshib ketdi").toBeLessThanOrEqual(0);
};
