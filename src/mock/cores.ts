export type Core = {
  id: string;
  name: string;
  tag: "natura" | "città" | "astratto";
  uses: number;
  addedAt: string;
  seed: number;
  mine: boolean;
};

export const CORES: Core[] = [
  { id: "c1", name: "pioggia", tag: "natura", uses: 14, addedAt: "2026-10-08", seed: 2, mine: true },
  { id: "c2", name: "neon strada", tag: "città", uses: 31, addedAt: "2026-10-02", seed: 5, mine: false },
  { id: "c3", name: "onde lente", tag: "natura", uses: 9, addedAt: "2026-09-28", seed: 9, mine: true },
  { id: "c4", name: "fumo", tag: "astratto", uses: 22, addedAt: "2026-09-25", seed: 12, mine: false },
  { id: "c5", name: "campo", tag: "natura", uses: 5, addedAt: "2026-09-20", seed: 16, mine: false },
  { id: "c6", name: "grattacieli", tag: "città", uses: 18, addedAt: "2026-09-14", seed: 21, mine: true },
  { id: "c7", name: "scintille", tag: "astratto", uses: 27, addedAt: "2026-09-09", seed: 24, mine: false },
  { id: "c8", name: "nebbia", tag: "natura", uses: 11, addedAt: "2026-09-01", seed: 28, mine: true },
  { id: "c9", name: "tramonto", tag: "natura", uses: 40, addedAt: "2026-08-27", seed: 33, mine: false },
  { id: "c10", name: "pulviscolo", tag: "astratto", uses: 3, addedAt: "2026-08-20", seed: 37, mine: false },
  { id: "c11", name: "vetro", tag: "astratto", uses: 16, addedAt: "2026-08-11", seed: 41, mine: true },
  { id: "c12", name: "marmo", tag: "astratto", uses: 7, addedAt: "2026-08-02", seed: 45, mine: false },
  { id: "c13", name: "brace", tag: "astratto", uses: 20, addedAt: "2026-07-22", seed: 48, mine: false },
  { id: "c14", name: "alghe", tag: "natura", uses: 2, addedAt: "2026-07-10", seed: 52, mine: false },
  { id: "c15", name: "tangenziale", tag: "città", uses: 13, addedAt: "2026-06-30", seed: 56, mine: true },
  { id: "c16", name: "ombre lunghe", tag: "città", uses: 8, addedAt: "2026-06-12", seed: 61, mine: false },
];
