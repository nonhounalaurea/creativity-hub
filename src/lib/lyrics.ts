/**
 * Logica pura dei testi sincronizzati (nessuna dipendenza dal browser).
 *
 * Modello salvato in songs.lyrics (jsonb):
 *   { version: 1, lines: [{ text, start, end, words?: [{ text, start, end }] }] }
 * Una riga senza tempo ha start = null ed end = null. `end` è derivato dall'inizio della
 * riga successiva (l'ultima dura al massimo LAST_LINE_SECONDS) e può essere ridotto a mano.
 */
import { MAX_DURATION_SECONDS } from "@/config/format";

export type LyricWord = { text: string; start: number; end: number };
export type LyricLine = { text: string; start: number | null; end: number | null; words?: LyricWord[] };
export type LyricsDoc = { version: 1; lines: LyricLine[] };

/** Durata di default dell'ultima riga sincronizzata (limitata alla durata del brano). */
export const LAST_LINE_SECONDS = 5;
/** Lunghezza minima di una riga quando si modifica la fine a mano. */
export const MIN_LINE_SECONDS = 0.05;
const EPS = 1e-6;

export const round3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ------------------------------------------------------------------ testo

/** Una riga per verso: spazi normalizzati, righe vuote scartate. */
export function parseLyricsText(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

export function lyricsToText(lines: LyricLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

/**
 * Trasforma il testo in righe conservando i tempi delle righe invariate:
 * prima per stessa posizione e stesso testo, poi per testo uguale in un'altra posizione.
 */
export function linesFromText(text: string, prev: LyricLine[] = [], duration = 0): LyricLine[] {
  const texts = parseLyricsText(text);
  const used = new Set<number>();
  const match: number[] = texts.map((t, i) => {
    if (prev[i] && prev[i].text === t) {
      used.add(i);
      return i;
    }
    return -1;
  });
  texts.forEach((t, i) => {
    if (match[i] >= 0) return;
    const j = prev.findIndex((p, k) => !used.has(k) && p.text === t);
    if (j >= 0) {
      used.add(j);
      match[i] = j;
    }
  });
  const out = texts.map<LyricLine>((t, i) => {
    const p = match[i] >= 0 ? prev[match[i]] : null;
    return { text: t, start: p?.start ?? null, end: p?.end ?? null };
  });
  return deriveEnds(out, duration);
}

// -------------------------------------------------------------- parole

/** Divide una riga in parole con tempi proporzionali alla lunghezza (solo lettere e cifre contano). */
export function splitWords(text: string, start: number, end: number): LyricWord[] {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const s = start;
  const e = Math.max(start, end);
  const weights = parts.map((p) => Math.max(1, [...p.replace(/[^\p{L}\p{N}]/gu, "")].length));
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return parts.map((p, i) => {
    const ws = s + ((e - s) * acc) / total;
    acc += weights[i];
    const we = i === parts.length - 1 ? e : s + ((e - s) * acc) / total;
    return { text: p, start: round3(ws), end: round3(we) };
  });
}

// ---------------------------------------------------------------- tempi

function nextStart(lines: LyricLine[], i: number): number | null {
  for (let k = i + 1; k < lines.length; k++) if (lines[k].start != null) return lines[k].start;
  return null;
}
function prevStart(lines: LyricLine[], i: number): number | null {
  for (let k = i - 1; k >= 0; k--) if (lines[k].start != null) return lines[k].start;
  return null;
}

/**
 * Ricalcola `end` di ogni riga con tempo: di default l'inizio della riga con tempo successiva
 * (l'ultima: start + LAST_LINE_SECONDS, al massimo la durata del brano). Un `end` già impostato
 * resta se valido (dopo start e non oltre il limite). Non modifica l'input.
 */
export function deriveEnds(lines: LyricLine[], duration = 0): LyricLine[] {
  const dur = duration > 0 ? duration : null;
  return lines.map((l, i) => {
    if (l.start == null || !Number.isFinite(l.start)) return { text: l.text, start: null, end: null };
    const start = l.start;
    const next = nextStart(lines, i);
    let hard: number;
    let def: number;
    if (next != null) {
      hard = def = Math.max(start, next);
    } else {
      def = Math.max(start, Math.min(dur ?? Infinity, start + LAST_LINE_SECONDS));
      hard = Math.max(start, dur ?? start + LAST_LINE_SECONDS);
    }
    const keep = l.end != null && l.end > start + EPS && l.end <= hard + EPS;
    const out: LyricLine = { text: l.text, start, end: round3(keep ? (l.end as number) : def) };
    return out;
  });
}

/** Se la fine della riga precedente "seguiva" l'inizio di i, la rimette in derivazione. */
function releasePrevEnd(lines: LyricLine[], i: number, oldStart: number | null): LyricLine[] {
  let k = i - 1;
  while (k >= 0 && lines[k].start == null) k--;
  if (k < 0) return lines;
  const p = lines[k];
  const follows = p.end == null || (oldStart != null && Math.abs(p.end - oldStart) < 1e-3);
  if (!follows) return lines;
  const out = lines.slice();
  out[k] = { ...p, end: null };
  return out;
}

function withStart(lines: LyricLine[], i: number, v: number | null): LyricLine[] {
  const out = lines.slice();
  out[i] = { text: lines[i].text, start: v, end: v == null ? null : lines[i].end };
  return out;
}

/** Imposta l'inizio di una riga restando tra le righe vicine (l'ordine non si inverte). */
export function setLineStart(lines: LyricLine[], i: number, t: number, duration = 0): LyricLine[] {
  if (i < 0 || i >= lines.length || !Number.isFinite(t)) return lines;
  const dur = duration > 0 ? duration : Infinity;
  const lo = prevStart(lines, i) ?? 0;
  const hi = Math.min(nextStart(lines, i) ?? Infinity, dur);
  const v = round3(clamp(t, Math.min(lo, hi), Math.max(lo, hi)));
  const rel = releasePrevEnd(lines, i, lines[i].start);
  return deriveEnds(withStart(rel, i, v), duration);
}

/**
 * Assegnazione "tap": imposta l'inizio della riga i al tempo t (non prima della riga precedente).
 * Le righe successive che avevano già un tempo <= t vengono azzerate, così l'ordine resta crescente.
 */
export function tapLine(lines: LyricLine[], i: number, t: number, duration = 0): LyricLine[] {
  if (i < 0 || i >= lines.length || !Number.isFinite(t)) return lines;
  const dur = duration > 0 ? duration : Infinity;
  const v = round3(clamp(t, Math.min(prevStart(lines, i) ?? 0, dur), dur));
  let out = releasePrevEnd(lines, i, lines[i].start);
  out = withStart(out, i, v);
  for (let k = i + 1; k < out.length; k++) {
    const s = out[k].start;
    if (s != null && s <= v) out = withStart(out, k, null);
  }
  return deriveEnds(out, duration);
}

/** Sposta l'inizio di una riga già sincronizzata (nudge). */
export function nudgeLineStart(lines: LyricLine[], i: number, delta: number, duration = 0): LyricLine[] {
  const s = lines[i]?.start;
  if (s == null) return lines;
  return setLineStart(lines, i, s + delta, duration);
}

/** Modifica la fine di una riga: dopo l'inizio e non oltre la riga successiva (o la durata). */
export function setLineEnd(lines: LyricLine[], i: number, end: number, duration = 0): LyricLine[] {
  const l = lines[i];
  if (!l || l.start == null || !Number.isFinite(end)) return lines;
  const next = nextStart(lines, i);
  const hi = next != null ? Math.max(l.start, next) : duration > 0 ? duration : Infinity;
  const v = round3(clamp(end, l.start + MIN_LINE_SECONDS, Math.max(hi, l.start + MIN_LINE_SECONDS)));
  const out = lines.slice();
  out[i] = { ...l, end: v };
  return deriveEnds(out, duration);
}

export function clearLineTime(lines: LyricLine[], i: number, duration = 0): LyricLine[] {
  if (!lines[i] || lines[i].start == null) return lines;
  const rel = releasePrevEnd(lines, i, lines[i].start);
  return deriveEnds(withStart(rel, i, null), duration);
}

export function clearAllTimes(lines: LyricLine[]): LyricLine[] {
  return lines.map((l) => ({ text: l.text, start: null, end: null }));
}

export const countTimed = (lines: LyricLine[]) => lines.filter((l) => l.start != null).length;

/** Vero quando ci sono righe e tutte hanno un tempo (= songs.analyzed). */
export const isFullySynced = (lines: LyricLine[]) => lines.length > 0 && lines.every((l) => l.start != null);

export function isMonotonic(lines: LyricLine[]): boolean {
  let last = -Infinity;
  for (const l of lines) {
    if (l.start == null) continue;
    if (l.start < last) return false;
    last = l.start;
  }
  return true;
}

/** Indice della riga che sta suonando al tempo t (-1 se nessuna). */
export function lineAtTime(lines: LyricLine[], t: number): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const s = lines[i].start;
    if (s != null && s <= t) {
      const e = lines[i].end;
      return e != null && t >= e && e > s ? -1 : i;
    }
  }
  return -1;
}

// -------------------------------------------------------------- snippet

export type SnippetRange = { start: number; end: number };

/** Inizio/fine di uno snippet da riga `from` a riga `to` (null se i tempi mancano o sono incoerenti). */
export function snippetRange(lines: LyricLine[], from: number, to: number): SnippetRange | null {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from < 0 || to < from || to >= lines.length) return null;
  for (let k = from; k <= to; k++) if (lines[k].start == null || lines[k].end == null) return null;
  const start = lines[from].start as number;
  const end = lines[to].end as number;
  return end > start ? { start, end } : null;
}

export function snippetDuration(lines: LyricLine[], from: number, to: number): number | null {
  const r = snippetRange(lines, from, to);
  return r ? round3(r.end - r.start) : null;
}

export const isOverMax = (seconds: number, max = MAX_DURATION_SECONDS) => seconds > max + EPS;
export const clampToMax = (seconds: number, max = MAX_DURATION_SECONDS) => Math.min(seconds, max);

export type FittedSnippet = { from: number; to: number; start: number; end: number; truncated: boolean };

/**
 * Adatta lo snippet a `max` secondi accorciando `to` all'ultima riga che ci sta.
 * Se già la prima riga è più lunga di `max`, la fine viene tagliata a start + max.
 */
export function fitSnippetToMax(lines: LyricLine[], from: number, to: number, max = MAX_DURATION_SECONDS): FittedSnippet | null {
  const r = snippetRange(lines, from, to);
  if (!r) return null;
  if (r.end - r.start <= max + EPS) return { from, to, start: r.start, end: r.end, truncated: false };
  let last = -1;
  for (let k = from; k <= to; k++) {
    if ((lines[k].end as number) - r.start <= max + EPS) last = k;
    else break;
  }
  if (last < 0) return { from, to: from, start: r.start, end: round3(r.start + max), truncated: true };
  return { from, to: last, start: r.start, end: lines[last].end as number, truncated: true };
}

// ------------------------------------------------------- (de)serializzazione

/** Documento da salvare: fini derivate e parole con tempi proporzionali per le righe con tempo. */
export function finalizeLyrics(lines: LyricLine[], duration = 0): LyricsDoc {
  const done = deriveEnds(lines, duration);
  return {
    version: 1,
    lines: done.map((l) =>
      l.start != null && l.end != null
        ? { text: l.text, start: l.start, end: l.end, words: splitWords(l.text, l.start, l.end) }
        : { text: l.text, start: null, end: null },
    ),
  };
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Legge songs.lyrics dal database; null se il formato non è riconosciuto. */
export function parseLyricsDoc(json: unknown): LyricLine[] | null {
  if (!json || typeof json !== "object") return null;
  const doc = json as { version?: unknown; lines?: unknown };
  if (doc.version !== 1 || !Array.isArray(doc.lines)) return null;
  const out: LyricLine[] = [];
  for (const raw of doc.lines) {
    if (!raw || typeof raw !== "object" || typeof (raw as { text?: unknown }).text !== "string") return null;
    const r = raw as { text: string; start?: unknown; end?: unknown; words?: unknown };
    const start = num(r.start);
    const line: LyricLine = { text: r.text, start, end: start == null ? null : num(r.end) };
    if (Array.isArray(r.words)) {
      const words = r.words.flatMap((w): LyricWord[] => {
        const x = w as { text?: unknown; start?: unknown; end?: unknown };
        const s = num(x.start);
        const e = num(x.end);
        return typeof x.text === "string" && s != null && e != null ? [{ text: x.text, start: s, end: e }] : [];
      });
      if (words.length > 0) line.words = words;
    }
    out.push(line);
  }
  return out;
}

export const lineText = (lines: LyricLine[], i: number) => lines[i]?.text ?? "";
