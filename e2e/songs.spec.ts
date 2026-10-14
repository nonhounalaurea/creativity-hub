/**
 * Fase 3: canzoni (upload, testo, sync a tastiera, snippet). Richiede un utente Supabase reale
 * (E2E_EMAIL/E2E_PASSWORD) e la migrazione 0001 applicata: senza credenziali è saltato.
 * Carica file audio generati nel test e li elimina a fine prova (prefisso e2e-fase3-).
 */
import { test, expect } from "@playwright/test";
import { HAS_CREDS, SKIP_REASON, login } from "./helpers";
import {
  E2E_PREFIX,
  LYRICS,
  cleanupTestSongs,
  deleteSongFromList,
  makeWav,
  openSong,
  pasteLyrics,
  syncByNumbers,
  uniqueTitle,
  uploadTestSong,
} from "./songs-helpers";

test.describe("canzoni (richiedono login reale)", () => {
  test.skip(!HAS_CREDS, SKIP_REASON);
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });
  test.afterAll(async ({ browser }) => {
    if (!HAS_CREDS) return;
    const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const page = await ctx.newPage();
    await login(page);
    await cleanupTestSongs(page);
    await ctx.close();
  });

  test("s1. /songs: titolo, limite visibile, upload con avanzamento, card, ricerca e filtri", async ({ page }) => {
    await page.goto("/songs");
    await expect(page.getByRole("heading", { level: 1, name: "songs" })).toBeVisible();
    await expect(page.getByTestId("upload-limit")).toContainText("50 MB");
    const title = await uploadTestSong(page, uniqueTitle(), 12);
    const card = page.locator('[data-testid="item"]', { hasText: title });
    await expect(card.getByTestId("badge-todo")).toBeVisible();
    await expect(card.getByTestId("snippet-count")).toHaveText("0 snippet");
    await expect(card.getByTestId("mini-wave")).toBeVisible();

    await page.getByTestId("search").fill(title);
    await expect(page.getByTestId("item")).toHaveCount(1);
    await page.getByTestId("search").fill("zzz-nessuna-canzone-zzz");
    await expect(page.getByTestId("empty")).toBeVisible();
    await page.getByTestId("search").fill("");

    await page.getByTestId("filter-ready").click();
    await expect(page.locator('[data-testid="item"]', { hasText: title })).toHaveCount(0);
    await page.getByTestId("filter-todo").click();
    await expect(page.locator('[data-testid="item"]', { hasText: title })).toHaveCount(1);
    await page.getByTestId("filter-all").click();
    await page.getByTestId("sort").selectOption("title");
    await expect(page.getByTestId("items")).toBeVisible();
  });

  test("s2. file oltre 50 MB o formato sbagliato: errore leggibile, nessun upload", async ({ page }) => {
    await page.goto("/songs");
    const input = page.getByTestId("upload-input");
    await input.setInputFiles({ name: "troppo-grande.wav", mimeType: "audio/wav", buffer: Buffer.alloc(51 * 1024 * 1024) });
    await expect(page.getByTestId("upload-error").first()).toContainText("il limite è 50 MB");
    await input.setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("ciao") });
    await expect(page.getByTestId("upload-error").nth(1)).toContainText("formato non supportato");
  });

  test("s3. rinomina, tap-to-sync con la tastiera, tempi e snippet persistono dopo il reload, elimina", async ({ page }) => {
    test.setTimeout(180_000);
    const title = await uploadTestSong(page, uniqueTitle(), 30);
    await openSong(page, title);
    await expect(page.getByTestId("peaks-loading")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId("peaks-failed")).toHaveCount(0);

    // rinomina
    await page.getByTestId("song-rename").click();
    await page.getByTestId("rename-artist").fill("artista e2e");
    await page.getByTestId("rename-save").click();
    await expect(page.getByTestId("song-artist")).toHaveText("artista e2e");

    // testo: righe vuote ignorate
    await pasteLyrics(page);
    await page.getByTestId("tab-sync").click();
    await expect(page.getByTestId("sync-count")).toContainText(`0/${LYRICS.length}`);
    await expect(page.getByTestId("shortcuts")).toContainText("spazio");

    // sync a tastiera: il primo spazio avvia la canzone, i successivi assegnano
    await page.getByTestId("song-title").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(700);
    }
    const starts = async () =>
      Promise.all(LYRICS.map(async (_, i) => (await page.getByTestId(`line-start-${i}`).inputValue()).replace(",", ".")));
    let s = await starts();
    expect(s.slice(0, 3).every((v) => v !== "")).toBe(true);
    expect(s[3]).toBe("");
    expect(Number(s[0])).toBeGreaterThan(0.3);
    expect(Number(s[1])).toBeGreaterThan(Number(s[0]));
    expect(Number(s[2])).toBeGreaterThan(Number(s[1]));

    await page.keyboard.press("z"); // annulla l'ultima assegnazione
    s = await starts();
    expect(s[2]).toBe("");
    await page.keyboard.press("Space");
    await page.waitForTimeout(700);
    await page.keyboard.press("Space");
    await page.waitForTimeout(700);
    await page.keyboard.press("Space");
    await expect(page.getByTestId("sync-count")).toContainText(`${LYRICS.length}/${LYRICS.length}`);
    await page.keyboard.press("p"); // pausa

    // correzione fine: nudge da tastiera e da pulsante
    const before = Number((await page.getByTestId("line-start-4").inputValue()).replace(",", "."));
    await page.getByTestId("line-plus-4").click();
    const after = Number((await page.getByTestId("line-start-4").inputValue()).replace(",", "."));
    expect(after).toBeCloseTo(before + 0.05, 2);
    await page.getByTestId("zoom-in").click();
    await expect(page.getByTestId("zoom-level")).toHaveText("2×");

    // tempi di prova controllati per lo snippet (file da 30 s)
    await syncByNumbers(page, [0.5, 6, 12, 25, 28]);
    await expect(page.getByTestId("badge-ready")).toBeVisible();
    const saved = await starts();

    // snippet: oltre 20 s bloccato, adatta, salva
    await page.getByTestId("tab-snippets").click();
    await page.getByTestId("snippet-da").selectOption("0");
    await page.getByTestId("snippet-a").selectOption("4");
    await expect(page.getByTestId("snippet-over")).toBeVisible();
    await expect(page.getByTestId("snippet-save")).toBeDisabled();
    await page.getByTestId("snippet-fit").click();
    await expect(page.getByTestId("snippet-over")).toHaveCount(0);
    await expect(page.getByTestId("snippet-duration")).toContainText("11,50 s");
    await page.getByTestId("snippet-save").click();
    await expect(page.getByTestId("snippet-item")).toHaveCount(1);
    await page.getByTestId("snippet-play").click();
    await expect(page.getByTestId("snippet-play")).toHaveText("stop");
    await page.getByTestId("snippet-play").click();

    // persistenza dopo reload
    await page.reload();
    await expect(page.getByTestId("song-editor")).toBeVisible();
    await expect(page.getByTestId("badge-ready")).toBeVisible();
    await page.getByTestId("tab-sync").click();
    expect(await starts()).toEqual(saved);
    await page.getByTestId("tab-snippets").click();
    await expect(page.getByTestId("snippet-item")).toHaveCount(1);
    await expect(page.getByTestId("snippet-item")).toContainText(LYRICS[0]);

    // /songs: analizzata, 1 snippet, filtro "analizzate"
    await page.goto("/songs");
    const card = page.locator('[data-testid="item"]', { hasText: title });
    await expect(card.getByTestId("badge-ready")).toBeVisible();
    await expect(card.getByTestId("snippet-count")).toHaveText("1 snippet");
    await page.getByTestId("filter-ready").click();
    await expect(card).toHaveCount(1);

    // /create usa i dati reali
    await page.goto("/create");
    await page.getByTestId("song-select").selectOption({ label: `${title} — artista e2e` });
    await expect(page.getByTestId("segment-from")).toHaveText(LYRICS[0]);
    await expect(page.getByTestId("segment-to")).toHaveText(LYRICS[1]);
    await expect(page.getByTestId("segment-edit")).toHaveAttribute("href", /\/songs\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("ready-button")).toBeDisabled();
    await page.getByTestId("core-c2").click();
    await expect(page.getByTestId("ready-button")).toBeEnabled();

    // elimina (riga + file)
    expect(await deleteSongFromList(page, title)).toBe(true);
  });

  test("s4. nessuno scroll orizzontale a 390 px su /songs e /songs/[id]", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const title = await uploadTestSong(page, uniqueTitle(), 12);
    const check = async (label: string) => {
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      expect(sw, `${label}: scrollWidth ${sw} > ${iw}`).toBeLessThanOrEqual(iw);
    };
    await check("/songs");
    await openSong(page, title);
    await pasteLyrics(page);
    for (const t of ["text", "sync", "snippets"]) {
      await page.getByTestId(`tab-${t}`).click();
      await check(`/songs/[id] ${t}`);
    }
    await expect(page.getByTestId("tab-sync")).toBeVisible();
    await deleteSongFromList(page, title);
  });

  test("s5. canzone inesistente: messaggio chiaro", async ({ page }) => {
    await page.goto("/songs/00000000-0000-4000-8000-000000000000");
    await expect(page.getByTestId("song-notfound")).toBeVisible();
    await page.goto("/songs/non-un-uuid");
    await expect(page.getByTestId("song-notfound")).toBeVisible();
  });
});

test.describe("canzoni senza login", () => {
  test("/songs e /songs/[id] reindirizzano a /login", async ({ page }) => {
    for (const r of ["/songs", "/songs/00000000-0000-4000-8000-000000000000"]) {
      await page.goto(r);
      await expect(page).toHaveURL(/\/login$/);
    }
  });
  test("il generatore di wav produce un file valido", () => {
    const b = makeWav(1);
    expect(b.toString("ascii", 0, 4)).toBe("RIFF");
    expect(b.length).toBe(44 + 8000 * 2);
    expect(E2E_PREFIX).toBe("e2e-fase3-");
  });
});
