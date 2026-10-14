import { describe, expect, it } from "vitest";
import { bucketsFor, compactPeaks, computePeaks, normalizePeaks, parseStoredPeaks, peaksToColumns } from "./waveform";

describe("computePeaks", () => {
  it("picco assoluto per intervallo, su più canali", () => {
    const l = Float32Array.from([0.1, -0.5, 0.2, 0.3]);
    const r = Float32Array.from([0, 0, -0.9, 0]);
    const p = computePeaks([l, r], 2);
    expect(Array.from(p)).toEqual([expect.closeTo(0.5, 5), expect.closeTo(0.9, 5)]);
  });
  it("input vuoto o buckets <= 0 -> array vuoto", () => {
    expect(computePeaks([], 10)).toHaveLength(0);
    expect(computePeaks([new Float32Array(0)], 10)).toHaveLength(0);
    expect(computePeaks([Float32Array.from([1])], 0)).toHaveLength(0);
  });
  it("più intervalli dei campioni: uno per campione", () => {
    expect(computePeaks([Float32Array.from([0.2, 0.4])], 10)).toHaveLength(2);
  });
  it("file lungo: campiona a passo ma trova comunque i picchi regolari", () => {
    const n = 2_000_000;
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i += 100) ch[i] = i < n / 2 ? 0.2 : 0.8;
    const p = computePeaks([ch], 4, 1000); // passo 500: tocca multipli di 100? 500 sì
    expect(p).toHaveLength(4);
    expect(p[0]).toBeCloseTo(0.2, 5);
    expect(p[3]).toBeCloseTo(0.8, 5);
  });
});

describe("normalizePeaks / bucketsFor", () => {
  it("normalizza a 1; silenzio resta 0", () => {
    expect(Array.from(normalizePeaks(Float32Array.from([0.25, 0.5])))).toEqual([0.5, 1]);
    expect(Array.from(normalizePeaks(Float32Array.from([0, 0])))).toEqual([0, 0]);
  });
  it("bucketsFor: limiti e durate non valide", () => {
    expect(bucketsFor(0)).toBe(400);
    expect(bucketsFor(NaN)).toBe(400);
    expect(bucketsFor(60)).toBe(3000);
    expect(bucketsFor(10_000)).toBe(30000);
  });
});

describe("peaksToColumns", () => {
  const peaks = Float32Array.from([0.1, 0.9, 0.2, 0.3]);
  it("massimo per colonna", () => {
    expect(Array.from(peaksToColumns(peaks, 2))).toEqual([expect.closeTo(0.9, 5), expect.closeTo(0.3, 5)]);
  });
  it("più colonne dei picchi: ripete il picco più vicino", () => {
    const c = peaksToColumns(peaks, 8);
    expect(c).toHaveLength(8);
    expect(c[0]).toBeCloseTo(0.1, 5);
    expect(c[7]).toBeCloseTo(0.3, 5);
  });
  it("finestra parziale (zoom)", () => {
    const c = peaksToColumns(peaks, 1, 0.5, 1);
    expect(c[0]).toBeCloseTo(0.3, 5);
  });
  it("vuoto o 0 colonne", () => {
    expect(peaksToColumns([], 5)).toEqual(new Float32Array(5));
    expect(peaksToColumns(peaks, 0)).toHaveLength(0);
  });
});

describe("picchi salvati", () => {
  it("compactPeaks arrotonda a 2 decimali e dà n valori", () => {
    const c = compactPeaks(Float32Array.from({ length: 1000 }, (_, i) => (i % 10) / 10 + 0.001), 50);
    expect(c).toHaveLength(50);
    expect(c.every((v) => v === Math.round(v * 100) / 100)).toBe(true);
  });
  it("parseStoredPeaks valida il formato", () => {
    expect(parseStoredPeaks([0, 0.5, 2])!.at(-1)).toBe(1);
    expect(parseStoredPeaks([])).toBeNull();
    expect(parseStoredPeaks("x")).toBeNull();
    expect(parseStoredPeaks([0.1, "a"])).toBeNull();
    expect(parseStoredPeaks(null)).toBeNull();
  });
});
