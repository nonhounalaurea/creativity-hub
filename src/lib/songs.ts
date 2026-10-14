/**
 * Accesso ai dati delle canzoni (tabelle songs/snippets + bucket "songs").
 * Gira nel browser con la sessione dell'utente: la sicurezza è garantita da RLS e dalle policy dello storage.
 */
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { SIGNED_URL_SECONDS, SONGS_BUCKET } from "@/config/songs";
import { safeFileName, titleFromFileName, uploadErrorMessage, validateAudioFile } from "@/lib/files";
import { decodePeaks, readAudioDuration } from "@/lib/audio";
import { compactPeaks, parseStoredPeaks } from "@/lib/waveform";
import type { LyricsDoc } from "@/lib/lyrics";

export type SongRow = {
  id: string;
  title: string;
  artist: string | null;
  file_path: string | null;
  duration_seconds: number | null;
  analyzed: boolean;
  created_at: string;
  lyrics?: unknown;
  /** Colonna facoltativa (migrazione 0002): picchi compatti per le miniature. */
  peaks?: unknown;
  snippets?: { count: number }[];
};

export type SnippetRow = {
  id: string;
  song_id: string;
  from_line: number;
  to_line: number;
  start_seconds: number;
  end_seconds: number;
  created_at: string;
};

export type SongWithSnippets = Omit<SongRow, "snippets"> & { snippets: SnippetRow[] };

const BASE_COLS = "id,title,artist,file_path,duration_seconds,analyzed,created_at";

const toNum = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const normSong = <T extends { duration_seconds?: unknown }>(r: T): T => ({ ...r, duration_seconds: toNum(r.duration_seconds) });
const normSnippet = (r: SnippetRow): SnippetRow => ({
  ...r,
  start_seconds: Number(r.start_seconds),
  end_seconds: Number(r.end_seconds),
});

function message(e: { message?: string } | null | undefined, fallback: string): string {
  return e?.message ? `${fallback} (${e.message})` : fallback;
}

/** La colonna peaks esiste solo dopo la migrazione 0002: ricordiamo se manca. */
let hasPeaksColumn: boolean | undefined;
const isMissingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42703" || e.code === "PGRST204" || /peaks/i.test(e.message ?? ""));

// ---------------------------------------------------------------- cache locale picchi

const peaksKey = (id: string) => `hub:peaks:${id}`;
export function readCachedPeaks(id: string): Float32Array | null {
  try {
    return parseStoredPeaks(JSON.parse(localStorage.getItem(peaksKey(id)) ?? "null"));
  } catch {
    return null;
  }
}
function cachePeaks(id: string, compact: number[]) {
  try {
    localStorage.setItem(peaksKey(id), JSON.stringify(compact));
  } catch {
    /* storage non disponibile: la miniatura resta vuota */
  }
}

/** Miniatura della canzone: picchi dal database, altrimenti dalla cache del browser. */
export function thumbPeaks(song: Pick<SongRow, "id" | "peaks">): Float32Array | null {
  return parseStoredPeaks(song.peaks) ?? readCachedPeaks(song.id);
}

/** Salva i picchi compatti (database se la colonna esiste + cache locale). Non lancia mai. */
export async function savePeaks(id: string, peaks: Float32Array): Promise<void> {
  const compact = compactPeaks(peaks);
  cachePeaks(id, compact);
  if (hasPeaksColumn === false) return;
  try {
    const { error } = await createClient().from("songs").update({ peaks: compact }).eq("id", id);
    if (error && isMissingColumn(error)) hasPeaksColumn = false;
  } catch {
    /* best effort */
  }
}

// ---------------------------------------------------------------- lettura

/** Elenco per la pagina /songs (con numero di snippet). */
export async function listSongs(): Promise<SongRow[]> {
  const sb = createClient();
  const run = (cols: string) => sb.from("songs").select(`${cols},snippets(count)`).order("created_at", { ascending: false });
  let res = hasPeaksColumn === false ? await run(BASE_COLS) : await run(`${BASE_COLS},peaks`);
  if (res.error && hasPeaksColumn !== false && isMissingColumn(res.error)) {
    hasPeaksColumn = false;
    res = await run(BASE_COLS);
  } else if (!res.error && hasPeaksColumn === undefined) {
    hasPeaksColumn = true;
  }
  if (res.error) throw new Error(message(res.error, "non riesco a leggere le canzoni"));
  return ((res.data ?? []) as unknown as SongRow[]).map(normSong);
}

/** Canzoni con testo e snippet interi, per la pagina /create. */
export async function listSongsWithSnippets(): Promise<SongWithSnippets[]> {
  const { data, error } = await createClient()
    .from("songs")
    .select(`${BASE_COLS},lyrics,snippets(id,song_id,from_line,to_line,start_seconds,end_seconds,created_at)`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(message(error, "non riesco a leggere le canzoni"));
  return ((data ?? []) as unknown as SongWithSnippets[]).map((s) => ({
    ...normSong(s),
    snippets: (s.snippets ?? []).map(normSnippet).sort((a, b) => a.start_seconds - b.start_seconds),
  }));
}

export async function getSong(id: string): Promise<SongRow | null> {
  const { data, error } = await createClient().from("songs").select("*").eq("id", id).maybeSingle();
  if (error) {
    // id non uuid -> errore di sintassi: per l'utente è "non trovata"
    if (error.code === "22P02") return null;
    throw new Error(message(error, "non riesco a leggere la canzone"));
  }
  return data ? normSong(data as SongRow) : null;
}

export async function listSnippets(songId: string): Promise<SnippetRow[]> {
  const { data, error } = await createClient()
    .from("snippets")
    .select("*")
    .eq("song_id", songId)
    .order("start_seconds", { ascending: true });
  if (error) throw new Error(message(error, "non riesco a leggere gli snippet"));
  return ((data ?? []) as SnippetRow[]).map(normSnippet);
}

/** Signed URL del file (bucket privato). */
export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await createClient().storage.from(SONGS_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error(message(error, "non riesco a leggere il file audio"));
  return data.signedUrl;
}

// ---------------------------------------------------------------- scrittura

export async function renameSong(id: string, title: string, artist: string): Promise<void> {
  const t = title.trim();
  if (!t) throw new Error("il titolo non può essere vuoto");
  const { error } = await createClient()
    .from("songs")
    .update({ title: t, artist: artist.trim() || null })
    .eq("id", id);
  if (error) throw new Error(message(error, "non riesco a salvare le modifiche"));
}

/** Elimina riga (snippet a cascata) e file nello storage. */
export async function deleteSong(song: Pick<SongRow, "id" | "file_path">): Promise<{ fileRemoved: boolean }> {
  const sb = createClient();
  const { error } = await sb.from("songs").delete().eq("id", song.id);
  if (error) throw new Error(message(error, "non riesco a eliminare la canzone"));
  if (!song.file_path) return { fileRemoved: true };
  const res = await sb.storage.from(SONGS_BUCKET).remove([song.file_path]);
  try {
    localStorage.removeItem(peaksKey(song.id));
  } catch {
    /* ignora */
  }
  return { fileRemoved: !res.error };
}

export async function saveLyrics(id: string, doc: LyricsDoc, analyzed: boolean): Promise<void> {
  const { error } = await createClient().from("songs").update({ lyrics: doc, analyzed }).eq("id", id);
  if (error) throw new Error(message(error, "non riesco a salvare il testo"));
}

export async function addSnippet(
  songId: string,
  s: { from_line: number; to_line: number; start_seconds: number; end_seconds: number },
): Promise<SnippetRow> {
  const { data, error } = await createClient().from("snippets").insert({ song_id: songId, ...s }).select("*").single();
  if (error) throw new Error(message(error, "non riesco a salvare lo snippet"));
  return normSnippet(data as SnippetRow);
}

export async function deleteSnippet(id: string): Promise<void> {
  const { error } = await createClient().from("snippets").delete().eq("id", id);
  if (error) throw new Error(message(error, "non riesco a eliminare lo snippet"));
}

// ---------------------------------------------------------------- upload

function xhrUpload(url: string, file: File, token: string, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () => reject(new Error(uploadErrorMessage(0)));
    xhr.onabort = () => reject(new Error("caricamento annullato"));
    // stesso formato multipart che usa supabase-js
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

export type UploadStage = "check" | "upload" | "analyze" | "save";

/**
 * Carica un file audio: controlli, durata, upload su `songs/<user_id>/<uuid>-<nomefile>` con avanzamento,
 * riga in `songs` e (best effort) picchi per la miniatura. Se la riga non si crea, il file viene rimosso.
 */
export async function uploadSong(
  file: File,
  onProgress: (fraction: number, stage: UploadStage) => void,
): Promise<SongRow> {
  const invalid = validateAudioFile(file);
  if (invalid) throw new Error(invalid);

  onProgress(0, "check");
  let duration: number;
  try {
    duration = await readAudioDuration(file);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "file audio non leggibile");
  }

  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  const { data: sess } = await sb.auth.getSession();
  if (!auth.user || !sess.session) throw new Error("sessione scaduta: esci e rientra");

  const path = `${auth.user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${SONGS_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  onProgress(0, "upload");
  await xhrUpload(url, file, sess.session.access_token, (f) => onProgress(f, "upload"));

  onProgress(1, "analyze");
  let peaks: Float32Array | null = null;
  try {
    peaks = (await decodePeaks(await file.arrayBuffer(), duration)).peaks;
  } catch {
    peaks = null; // la forma d'onda si ricalcola all'apertura della canzone
  }

  onProgress(1, "save");
  const { data, error } = await sb
    .from("songs")
    .insert({ title: titleFromFileName(file.name), file_path: path, duration_seconds: Math.round(duration * 1000) / 1000 })
    .select(BASE_COLS)
    .single();
  if (error || !data) {
    await sb.storage.from(SONGS_BUCKET).remove([path]);
    throw new Error(message(error, "non riesco a creare la canzone"));
  }
  const row = normSong(data as SongRow);
  if (peaks) await savePeaks(row.id, peaks);
  return row;
}
