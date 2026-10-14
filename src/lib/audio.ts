/** Utilità audio solo browser: durata dal file e picchi con Web Audio API. */
import { bucketsFor, computePeaks, normalizePeaks } from "./waveform";

/** Legge la durata (secondi) con un elemento audio. */
export function readAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      done();
      if (Number.isFinite(d) && d > 0) resolve(d);
      else reject(new Error("durata non leggibile"));
    };
    audio.onerror = () => {
      done();
      reject(new Error("il browser non riesce a leggere questo file audio"));
    };
    audio.src = url;
  });
}

/**
 * Decodifica con decodeAudioData (a 11,025 kHz per risparmiare memoria sui file lunghi)
 * e calcola i picchi normalizzati. Lancia se la decodifica fallisce.
 */
export async function decodePeaks(data: ArrayBuffer, durationHint = 0): Promise<{ peaks: Float32Array; duration: number }> {
  const w = window as unknown as {
    OfflineAudioContext?: typeof OfflineAudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  const Ctx = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!Ctx) throw new Error("Web Audio non disponibile");
  const ctx = new Ctx(1, 1, 11025);
  const buffer = await ctx.decodeAudioData(data);
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
  const duration = buffer.duration || durationHint;
  const peaks = normalizePeaks(computePeaks(channels, bucketsFor(duration || durationHint)));
  if (peaks.length === 0) throw new Error("audio vuoto");
  return { peaks, duration };
}
