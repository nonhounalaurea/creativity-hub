import { expect, type Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;
export const HAS_CREDS = Boolean(E2E_EMAIL && E2E_PASSWORD);
export const SKIP_REASON = "definire E2E_EMAIL e E2E_PASSWORD (utente Supabase reale) per eseguire questo test";

/** Login reale via UI (nessuna scorciatoia di auth). */
export async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(E2E_EMAIL!);
  await page.getByTestId("login-password").fill(E2E_PASSWORD!);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/create$/);
}
