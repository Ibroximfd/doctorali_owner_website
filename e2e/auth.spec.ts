import { expect, test } from "@playwright/test";

import { e2eCredentials, signIn } from "./helpers";

test("sessiyasiz tashrif kirish sahifasiga yo'naltiriladi va kirgach so'ralgan sahifaga qaytadi", async ({
  page,
}) => {
  await page.goto("/finance?period=7d");
  await expect(page).toHaveURL(/\/login\?next=/);

  const { username, password } = e2eCredentials();
  await page.getByLabel("Login").fill(username);
  await page.getByLabel("Parol").fill(password);
  await page.getByRole("button", { name: "Davom etish" }).click();

  await expect(page).toHaveURL(/\/finance\?period=7d/);
  await expect(page.getByRole("heading", { level: 1, name: "Moliya" })).toBeVisible();
});

test("chiqishdan keyin panel yopiladi", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: "Chiqish" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/finance");
  await expect(page).toHaveURL(/\/login/);
});
