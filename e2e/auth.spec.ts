import { test, expect } from "@playwright/test";
import { HAS_CREDS, SKIP_REASON, login } from "./helpers";

const ROUTES = ["create", "readys", "cores", "songs", "looks"];

test("a. senza sessione le 5 rotte (e /) reindirizzano a /login", async ({ page }) => {
  for (const r of ["", ...ROUTES]) {
    await page.goto(`/${r}`);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("b. /login mostra il form e un errore leggibile con credenziali sbagliate", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-email")).toBeVisible();
  await expect(page.getByTestId("login-password")).toBeVisible();
  await expect(page.getByRole("button", { name: "entra" })).toBeVisible();
  await expect(page.getByTestId("nav-create")).toHaveCount(0); // niente sidebar sul login
  await page.getByTestId("login-email").fill(`nessuno-${Date.now()}@example.invalid`);
  await page.getByTestId("login-password").fill("password-sbagliata");
  await page.getByRole("button", { name: "entra" }).click();
  await expect(page.getByTestId("login-error")).toHaveText("email o password non corrette");
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("con utente reale", () => {
  test.skip(!HAS_CREDS, SKIP_REASON);

  test("c. login -> /create, persiste al reload, /login rimanda a /create, logout -> /login", async ({ page }) => {
    await login(page);
    await expect(page.getByTestId("user-email")).toHaveText(process.env.E2E_EMAIL!);
    await page.reload();
    await expect(page).toHaveURL(/\/create$/);
    await expect(page.getByTestId("user-email")).toBeVisible();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/create$/);
    await page.getByTestId("logout").click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/songs");
    await expect(page).toHaveURL(/\/login$/);
  });
});
