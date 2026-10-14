export type LookOption = { id: string; name: string; seed: number };
export type LookSection = { id: string; label: string; items: LookOption[] };

const NONE: LookOption = { id: "none", name: "nessuno", seed: 0 };
const opts = (prefix: string, names: string[], base: number): LookOption[] => [
  NONE,
  ...names.map((name, i) => ({ id: `${prefix}${i + 1}`, name, seed: base + i * 7 })),
];

/** La prima opzione di ogni sezione è sempre "nessuno". */
export const LOOK_SECTIONS: LookSection[] = [
  { id: "preset", label: "preset", items: opts("p", ["alba", "ghiaccio", "brace", "foresta", "carta", "vetro"], 4) },
  { id: "text", label: "stili testo", items: opts("t", ["maiuscolo", "corsivo", "mono", "spesso", "sottile", "ombra"], 11) },
  { id: "effects", label: "effetti", items: opts("e", ["grana", "glitch", "sfocatura", "bagliore", "vhs", "onda"], 17) },
  { id: "overlay", label: "overlay", items: opts("o", ["vignetta", "righe", "punti", "bordo", "luce", "polvere"], 23) },
  { id: "transitions", label: "transizioni", items: opts("x", ["dissolvenza", "scorri", "zoom", "taglio", "onda", "spin"], 29) },
];

export type SavedLook = {
  id: string;
  name: string;
  preset: string;
  text: string;
  effect: string;
  overlay: string;
  transition: string;
  addedAt: string;
  uses: number;
  seed: number;
};

export const SAVED_LOOKS: SavedLook[] = [
  { id: "l1", name: "notte calda", preset: "brace", text: "maiuscolo", effect: "grana", overlay: "vignetta", transition: "dissolvenza", addedAt: "2026-10-09", uses: 12, seed: 6 },
  { id: "l2", name: "mattina fredda", preset: "ghiaccio", text: "sottile", effect: "sfocatura", overlay: "luce", transition: "scorri", addedAt: "2026-10-01", uses: 7, seed: 13 },
  { id: "l3", name: "videocassetta", preset: "carta", text: "mono", effect: "vhs", overlay: "righe", transition: "taglio", addedAt: "2026-09-18", uses: 21, seed: 20 },
  { id: "l4", name: "bosco", preset: "foresta", text: "corsivo", effect: "bagliore", overlay: "polvere", transition: "zoom", addedAt: "2026-09-05", uses: 4, seed: 27 },
  { id: "l5", name: "vetrina", preset: "vetro", text: "spesso", effect: "glitch", overlay: "bordo", transition: "spin", addedAt: "2026-08-23", uses: 15, seed: 34 },
  { id: "l6", name: "alba piano", preset: "alba", text: "ombra", effect: "onda", overlay: "punti", transition: "onda", addedAt: "2026-08-02", uses: 9, seed: 40 },
];
