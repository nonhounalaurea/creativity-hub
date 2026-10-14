import { expect, type Page } from "@playwright/test";

/** Prefisso dei brani creati dai test: servono per ripulire anche dopo un fallimento. */
export const E2E_PREFIX = "e2e-fase3-";

/** WAV mono 16 bit generato al volo (onda a 220 Hz con inviluppo): nessun file di prova nel repo. */
export function makeWav(seconds: number, rate = 8000): Buffer {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7));
    buf.writeInt16LE(Math.round(12000 * env * Math.sin(2 * Math.PI * 220 * t)), 44 + i * 2);
  }
  return buf;
}

export const LYRICS = ["accendo le luci sul tetto", "la città respira più piano", "ho un sole in tasca", "scrivo il tuo nome sul vetro", "domani sarà un'altra strada"];

export function uniqueTitle(): string {
  return `${E2E_PREFIX}${Date.now()}`;
}

/** Carica un wav generato dalla pagina /songs e attende la card. Restituisce il titolo (dal nome file). */
export async function uploadTestSong(page: Page, title = uniqueTitle(), seconds = 30): Promise<string> {
  await page.goto("/songs");
  await page.getByTestId("upload-input").setInputFiles({ name: `${title}.wav`, mimeType: "audio/wav", buffer: makeWav(seconds) });
  await expect(page.locator('[data-testid="item"]', { hasText: title })).toBeVisible({ timeout: 60_000 });
  return title;
}

export async function openSong(page: Page, title: string) {
  await page.goto("/songs");
  await page.locator('[data-testid="item"]', { hasText: title }).getByTestId("song-open").click();
  await expect(page.getByTestId("song-editor")).toBeVisible();
  await expect(page).toHaveURL(/\/songs\/[0-9a-f-]{36}$/);
}

export async function pasteLyrics(page: Page, lines = LYRICS) {
  await page.getByTestId("tab-text").click();
  await page.getByTestId("lyrics-text").fill(lines.join("\n\n")); // le righe vuote vanno ignorate
  await page.getByTestId("lyrics-save").click();
  await expect(page.getByTestId("lyrics-status")).toHaveText("testo salvato");
}

/**
 * Imposta gli inizi (crescenti) con i campi numerici e salva i tempi.
 * Dall'ultima alla prima riga: ogni riga può muoversi solo tra le sue vicine, così non si blocca.
 */
export async function syncByNumbers(page: Page, starts: number[]) {
  await page.getByTestId("tab-sync").click();
  for (let i = starts.length - 1; i >= 0; i--) {
    const f = page.getByTestId(`line-start-${i}`);
    await f.fill(String(starts[i]).replace(".", ","));
    await f.press("Enter");
  }
  await page.getByTestId("sync-save").click();
  await expect(page.getByTestId("sync-status")).toContainText("salvato");
}

export async function deleteSongFromList(page: Page, title: string) {
  await page.goto("/songs");
  const card = page.locator('[data-testid="item"]', { hasText: title }).first();
  if ((await card.count()) === 0) return false;
  await card.getByTestId("song-delete").click();
  await page.getByTestId("delete-confirm").click();
  await expect(page.locator('[data-testid="item"]', { hasText: title })).toHaveCount(0);
  return true;
}

/** Elimina tutti i brani creati dai test (prefisso e2e-fase3-). */
export async function cleanupTestSongs(page: Page) {
  await page.goto("/songs");
  for (let guard = 0; guard < 20; guard++) {
    const card = page.locator('[data-testid="item"]', { hasText: E2E_PREFIX }).first();
    if ((await card.count()) === 0) return;
    await card.getByTestId("song-delete").click();
    await page.getByTestId("delete-confirm").click();
    await page.waitForTimeout(500);
  }
}

/** Brano completo per le prove su /create: caricato, sincronizzato e con uno snippet. */
export async function seedSongWithSnippet(page: Page): Promise<{ title: string; optionLabel: string }> {
  const title = await uploadTestSong(page);
  await openSong(page, title);
  await pasteLyrics(page);
  await syncByNumbers(page, [0.5, 4, 8, 12, 16]);
  await page.getByTestId("tab-snippets").click();
  await page.getByTestId("snippet-da").selectOption("0");
  await page.getByTestId("snippet-a").selectOption("1");
  await page.getByTestId("snippet-save").click();
  await expect(page.getByTestId("snippet-item")).toHaveCount(1);
  return { title, optionLabel: `${title} — artista sconosciuto` };
}
