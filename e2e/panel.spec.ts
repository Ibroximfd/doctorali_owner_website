import { expect, test } from "@playwright/test";

import { PANEL_PATHS, expectNoHorizontalScroll, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("har bo'lim ochiladi, xatosiz chiziladi va gorizontal toshmaydi", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  for (const path of PANEL_PATHS) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
  }

  expect(errors).toEqual([]);
});

test("qorong'i mavzuda ham toshmaydi", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });

  for (const path of ["/", "/finance", "/warehouse"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
  }
});

test("tanlangan davr bo'limdan bo'limga o'tganda saqlanadi", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop filtr qatori");

  await page.getByRole("button", { name: "7 kun", exact: true }).click();
  await expect(page).toHaveURL(/period=7d/);

  await page
    .getByRole("navigation", { name: "Bo'limlar" })
    .getByRole("link", { name: /Analitika/ })
    .click();
  await expect(page).toHaveURL(/\/analytics\?period=7d/);
  await expect(page.getByRole("button", { name: "7 kun", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("Moliya xaritasida viloyat ustiga kelinsa raqamlari chiqadi", async ({ page, isMobile }) => {
  test.skip(isMobile, "telefonda hover yo'q — viloyat bosiladi");

  await page.goto("/finance");
  await page.getByRole("button", { name: /^Farg'ona:/ }).hover();
  await expect(page.getByText("Sotildi").first()).toBeVisible();
});

test("telefonda pastki tab-bar va 'Yana' varag'i ishlaydi", async ({ page, isMobile }) => {
  test.skip(!isMobile, "faqat telefon");

  const tabs = page.getByRole("navigation", { name: "Tezkor o'tish" });
  await tabs.getByRole("link", { name: /Moliya/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Moliya" })).toBeVisible();

  await tabs.getByRole("button", { name: "Yana" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Analitika" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Analitika" })).toBeVisible();
});
