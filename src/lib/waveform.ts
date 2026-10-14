/** Calcolo dei picchi per la forma d'onda (puro, testabile). */

/**
 * Picchi (valore assoluto massimo, tutti i canali) in `buckets` intervalli uguali.
 * Per file lunghi guarda al massimo `maxSamplesPerBucket` campioni per intervallo (campionamento a passo).
 */
export function computePeaks(channels: ArrayLike<number>[], buckets: number, maxSamplesPerBucket = 4000): Float32Array {
  const n = channels.length ? Math.min(...channels.map((c) => c.length)) : 0;
  if (n === 0 || buckets <= 0) return new Float32Array(0);
  const count = Math.min(Math.floor(buckets), n);
  const out = new Float32Array(count);
  for (let b = 0; b < count; b++) {
    const from = Math.floor((b * n) / count);
    const to = Math.max(from + 1, Math.floor(((b + 1) * n) / count));
    const step = Math.max(1, Math.floor((to - from) / maxSamplesPerBucket));
    let peak = 0;
    for (const ch of channels) {
      for (let i = from; i < to; i += step) {
        const v = Math.abs(ch[i]);
        if (v > peak) peak = v;
      }
    }
    out[b] = peak;
  }
  return out;
}

/** Riscala in 0..1 (se il file è silenzioso resta tutto a 0). */
export function normalizePeaks(peaks: Float32Array): Float32Array {
  let max = 0;
  for (const p of peaks) if (p > max) max = p;
  if (max <= 0) return peaks.slice();
  return peaks.map((p) => p / max);
}

/** Numero di intervalli per una durata: ~50 al secondo, tra 400 e 30000. */
export function bucketsFor(durationSeconds: number): number {
  const d = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  return Math.min(30000, Math.max(400, Math.round(d * 50)));
}

/** Picco massimo per colonna di pixel nella finestra [from, to] (frazioni 0..1 della durata). */
export function peaksToColumns(peaks: ArrayLike<number>, columns: number, from = 0, to = 1): Float32Array {
  const cols = Math.max(0, Math.floor(columns));
  const out = new Float32Array(cols);
  const n = peaks.length;
  if (n === 0 || cols === 0) return out;
  const a = Math.min(Math.max(from, 0), 1);
  const b = Math.min(Math.max(to, a), 1);
  for (let c = 0; c < cols; c++) {
    const lo = a + ((b - a) * c) / cols;
    const hi = a + ((b - a) * (c + 1)) / cols;
    const i0 = Math.min(n - 1, Math.floor(lo * n));
    const i1 = Math.min(n, Math.max(i0 + 1, Math.ceil(hi * n)));
    let m = 0;
    for (let i = i0; i < i1; i++) if (peaks[i] > m) m = peaks[i];
    out[c] = m;
  }
  return out;
}

/** Versione compatta (es. 200 valori a 2 decimali) da salvare nel database. */
export function compactPeaks(peaks: ArrayLike<number>, n = 200): number[] {
  return Array.from(peaksToColumns(peaks, n), (v) => Math.round(v * 100) / 100);
}

/** Legge picchi salvati (array di numeri 0..1); null se il formato non è valido. */
export function parseStoredPeaks(json: unknown): Float32Array | null {
  if (!Array.isArray(json) || json.length === 0 || json.length > 5000) return null;
  const out = new Float32Array(json.length);
  for (let i = 0; i < json.length; i++) {
    const v = json[i];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out[i] = Math.min(1, Math.max(0, v));
  }
  return out;
}

export const timeToFrac = (t: number, duration: number) => (duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 0);
export const fracToTime = (f: number, duration: number) => Math.min(duration, Math.max(0, f * duration));
