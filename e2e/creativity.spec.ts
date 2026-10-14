import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { HAS_CREDS, SKIP_REASON, login } from "./helpers";

const ROOT = path.resolve(__dirname, "..");
const FORMAT = path.join(ROOT, "src/config/format.ts");
const CSS = path.join(ROOT, "src/app/globals.css");
const SHOTS = path.join(ROOT, "e2e/screenshots");
const ROUTES = ["create", "readys", "cores", "songs", "looks"];

/** Modifica un file per la durata di fn e lo ripristina sempre. */
async function withEdit(file: string, from: string, to: string, fn: () => Promise<void>) {
  const original = fs.readFileSync(file, "utf8");
  expect(original).toContain(from);
  fs.writeFileSync(file, original.replace(from, to));
  try {
    await fn();
  } finally {
    fs.writeFileSync(file, original);
  }
}

/** Seleziona canzone + core e aggiunge una ready nella pagina create. */
async function addReady(page: Page) {
  await page.goto("/create");
  await page.getByTestId("song-select").selectOption({ index: 1 });
  await page.getByTestId("core-c2").click();
  await page.getByTestId("ready-button").click();
}

async function arRatios(page: Page): Promise<number[]> {
  return page.$$eval("[data-ar]", (els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return r.width / r.height;
    }),
  );
}

test("1. npm run build senza errori", async () => {
  test.setTimeout(300_000);
  // dist dir separata, per non toccare il dev server in esecuzione
  const out = execSync("npm run build", {
    cwd: ROOT,
    env: { ...process.env, NEXT_DIST_DIR: ".next-build" },
    stdio: "pipe",
    timeout: 280_000,
  }).toString();
  expect(out).toContain("Generating static pages");
  expect(out).not.toMatch(/Failed to compile|Type error/);
});

test.describe("pagine (Fase 1, richiedono login reale)", () => {
// Dalla Fase 2 le pagine richiedono login: questi test girano solo con E2E_EMAIL/E2E_PASSWORD.
test.skip(!HAS_CREDS, SKIP_REASON);
test.beforeEach(async ({ page }) => {
  await login(page);
});

test("2. le 5 rotte si aprono e la sidebar naviga", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/create$/);
  for (const r of ROUTES) {
    await page.goto(`/${r}`);
    await expect(page.getByRole("heading", { level: 1, name: r })).toBeVisible();
  }
  await page.goto("/create");
  for (const r of ROUTES) {
    await page.getByTestId(`nav-${r}`).click();
    await expect(page).toHaveURL(new RegExp(`/${r}$`));
    await expect(page.getByRole("heading", { level: 1, name: r })).toBeVisible();
  }
});

test("3. ready: disabilitato senza canzone+core, abilitato con entrambi, il click aggiunge anteprima", async ({ page }) => {
  await page.goto("/create");
  const ready = page.getByTestId("ready-button");
  await expect(ready).toBeDisabled();
  await expect(page.getByTestId("ready-hint")).toContainText("manca una canzone e almeno un core");
  await expect(page.getByTestId("readys-empty")).toHaveText("le tue ultime anteprime restano in alto");

  await page.getByTestId("song-select").selectOption({ index: 1 });
  await expect(ready).toBeDisabled(); // solo canzone
  await expect(page.getByTestId("ready-hint")).toContainText("manca almeno un core");
  await expect(page.getByTestId("segment-from")).toBeVisible();
  await expect(page.getByTestId("segment-to")).toBeVisible();

  await page.getByTestId("core-c2").click();
  await expect(ready).toBeEnabled();
  await expect(page.getByTestId("ready-item")).toHaveCount(0);
  await ready.click();
  await expect(page.getByTestId("ready-item")).toHaveCount(1);
  await ready.click();
  await expect(page.getByTestId("ready-item")).toHaveCount(2);

  // selezione multipla con shift+click
  await page.getByTestId("core-c4").click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("core-count")).toContainText("2 selezionati");
  await page.getByTestId("core-c7").click(); // click semplice = selezione singola
  await expect(page.getByTestId("core-count")).toContainText("1 selezionato");

  // solo core senza canzone: ancora disabilitato
  await page.goto("/create");
  await page.getByTestId("core-c2").click();
  await expect(page.getByTestId("ready-button")).toBeDisabled();
  await expect(page.getByTestId("ready-hint")).toContainText("manca una canzone");
});

test("4. anteprime ~19:6 e il rapporto segue ASPECT_RATIO ovunque", async ({ page }) => {
  test.setTimeout(180_000);
  const pages = ["/create", "/readys", "/cores", "/looks"];
  const check = async (expected: number) => {
    for (const p of pages) {
      if (p === "/create") await addReady(page);
      else await page.goto(p);
      const ratios = await arRatios(page);
      expect(ratios.length, `anteprime in ${p}`).toBeGreaterThan(3);
      for (const r of ratios) expect(Math.abs(r - expected) / expected, `${p} ratio ${r}`).toBeLessThan(0.02);
    }
  };
  await check(19 / 6);
  console.log("19/6 =", (19 / 6).toFixed(3), "ok su", pages.join(", "));

  await withEdit(FORMAT, "ASPECT_RATIO = 19 / 6", "ASPECT_RATIO = 9 / 16", async () => {
    await expect
      .poll(async () => { await page.goto("/readys"); return (await arRatios(page))[0]; }, { timeout: 40_000, intervals: [1500] })
      .toBeCloseTo(9 / 16, 1);
    await check(9 / 16);
    console.log("9/16 =", (9 / 16).toFixed(3), "ok su", pages.join(", "));
  });

  // ripristino verificato
  expect(fs.readFileSync(FORMAT, "utf8")).toContain("ASPECT_RATIO = 19 / 6");
  await expect
    .poll(async () => { await page.goto("/readys"); return (await arRatios(page))[0]; }, { timeout: 40_000, intervals: [1500] })
    .toBeCloseTo(19 / 6, 1);
});

test("5. cambiando --accent cambia il colore degli accenti", async ({ page }) => {
  test.setTimeout(120_000);
  const read = async () => {
    await page.goto("/create");
    await page.getByTestId("song-select").selectOption({ index: 1 });
    await page.getByTestId("core-c2").click();
    return page.evaluate(() => {
      const c = (sel: string, prop: "color" | "backgroundColor") =>
        getComputedStyle(document.querySelector(sel)!)[prop];
      return {
        logo: c('[data-testid="logo-accent"]', "color"),
        nav: c('[data-testid="nav-create"]', "color"),
        button: c('[data-testid="ready-button"]', "backgroundColor"),
        core: c('[data-testid="core-c2"] span', "color"),
      };
    });
  };
  const before = await read();
  expect(before.logo).toBe("rgb(122, 224, 176)");
  await withEdit(CSS, "--accent: #7ae0b0;", "--accent: #ff3366;", async () => {
    await expect.poll(async () => (await read()).logo, { timeout: 40_000, intervals: [1500] }).toBe("rgb(255, 51, 102)");
    const after = await read();
    for (const k of ["logo", "nav", "button", "core"] as const) {
      expect(after[k], k).toBe("rgb(255, 51, 102)");
      expect(before[k], k).toBe("rgb(122, 224, 176)");
    }
  });
  expect(fs.readFileSync(CSS, "utf8")).toContain("--accent: #7ae0b0;");
  await expect.poll(async () => (await read()).logo, { timeout: 40_000, intervals: [1500] }).toBe("rgb(122, 224, 176)");
});

test("6. nessuno scroll orizzontale a 1440px e 390px (+ screenshot)", async ({ page }) => {
  test.setTimeout(150_000);
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    for (const r of ROUTES) {
      await page.goto(`/${r}`);
      if (r === "create") {
        await page.getByTestId("song-select").selectOption({ index: 1 });
        await page.getByTestId("core-c2").click();
        await page.getByTestId("core-c4").click({ modifiers: ["Shift"] });
        await page.getByTestId("segment-edit").click();
        await page.getByTestId("segment-edit").click();
        await page.getByTestId("ready-button").click();
        await page.getByTestId("ready-button").click();
      }
      const { sw, iw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      expect(sw, `${r} @${width}: scrollWidth ${sw} > ${iw}`).toBeLessThanOrEqual(iw);
      if (r === "create") await page.screenshot({ path: path.join(SHOTS, `create-${name}.png`), fullPage: true });
    }
  }
});

});
