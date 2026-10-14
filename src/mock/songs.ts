export type LyricLine = { t: number; text: string };
export type Song = {
  id: string;
  title: string;
  artist: string;
  duration: number; // secondi
  bpm: number;
  addedAt: string;
  seed: number;
  lyrics: LyricLine[];
};

/** Ogni riga di testo dura (finto) 3 secondi. */
export const LINE_SECONDS = 3;

const POOL = [
  "accendo le luci sul tetto",
  "la città respira più piano",
  "ho un sole in tasca e nessuna fretta",
  "scrivo il tuo nome sul vetro",
  "domani sarà un'altra strada",
  "il mare ci aspetta oltre il ponte",
  "ogni silenzio ha il suo colore",
  "cantiamo finché non fa giorno",
  "le mani nel vento, il cuore a metà",
  "torna la notte, resta con me",
  "una scintilla basta per ripartire",
  "lasciamo le ombre al loro posto",
];

const mk = (shift: number): LyricLine[] =>
  Array.from({ length: 8 }, (_, i) => ({
    t: i * LINE_SECONDS,
    text: POOL[(i + shift) % POOL.length],
  }));

export const SONGS: Song[] = [
  { id: "s1", title: "luci sul tetto", artist: "aurora nord", duration: 187, bpm: 98, addedAt: "2026-09-02", seed: 3, lyrics: mk(0) },
  { id: "s2", title: "mare di vetro", artist: "i bassi fondali", duration: 214, bpm: 84, addedAt: "2026-08-18", seed: 8, lyrics: mk(3) },
  { id: "s3", title: "ultimo treno", artist: "mira", duration: 169, bpm: 120, addedAt: "2026-09-21", seed: 14, lyrics: mk(6) },
  { id: "s4", title: "carta e cenere", artist: "vela", duration: 201, bpm: 92, addedAt: "2026-07-30", seed: 19, lyrics: mk(1) },
  { id: "s5", title: "stanza nove", artist: "aurora nord", duration: 178, bpm: 110, addedAt: "2026-09-29", seed: 25, lyrics: mk(4) },
  { id: "s6", title: "oro lento", artist: "mira", duration: 233, bpm: 72, addedAt: "2026-06-11", seed: 31, lyrics: mk(7) },
  { id: "s7", title: "controvento", artist: "i bassi fondali", duration: 156, bpm: 132, addedAt: "2026-10-05", seed: 36, lyrics: mk(2) },
  { id: "s8", title: "città bassa", artist: "vela", duration: 192, bpm: 100, addedAt: "2026-05-24", seed: 42, lyrics: mk(5) },
];

/** Le tre canzoni disponibili nel menu della pagina create. */
export const DROPDOWN_SONGS: Song[] = SONGS.slice(0, 3);
