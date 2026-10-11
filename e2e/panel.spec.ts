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

  for (const path of ["/", "/orders", "/finance"]) {
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
    .getByRole("link", { name: /Buyurtmalar/ })
    .click();
  await expect(page).toHaveURL(/\/orders\?period=7d/);
  await expect(page.getByRole("button", { name: "7 kun", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("buyurtma qatori bosilsa karta ochiladi va Escape bilan yopiladi", async ({ page, isMobile }) => {
  test.skip(isMobile, "telefonda ro'yxat kartalar ko'rinishida — alohida ssenariy");

  await page.goto("/orders");
  await page
    .getByRole("button", { name: /DA-184011/ })
    .first()
    .click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("DA-184011");
  await expect(page).toHaveURL(/order=/);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("telefonda pastki tab-bar va 'Yana' varag'i ishlaydi", async ({ page, isMobile }) => {
  test.skip(!isMobile, "faqat telefon");

  const tabs = page.getByRole("navigation", { name: "Tezkor o'tish" });
  await tabs.getByRole("link", { name: /Moliya/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Moliya" })).toBeVisible();

  await tabs.getByRole("button", { name: "Yana" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Klinika" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Klinika" })).toBeVisible();
});
