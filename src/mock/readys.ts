export type Ready = {
  id: string;
  title: string;
  song: string;
  core: string;
  addedAt: string;
  duration: number;
  seed: number;
  line: string;
};

export const READYS: Ready[] = [
  { id: "r1", title: "luci sul tetto · 1", song: "luci sul tetto", core: "neon strada", addedAt: "2026-10-12", duration: 18, seed: 5, line: "accendo le luci sul tetto" },
  { id: "r2", title: "mare di vetro · 1", song: "mare di vetro", core: "onde lente", addedAt: "2026-10-10", duration: 15, seed: 9, line: "il mare ci aspetta oltre il ponte" },
  { id: "r3", title: "ultimo treno · 2", song: "ultimo treno", core: "tangenziale", addedAt: "2026-10-07", duration: 20, seed: 56, line: "le mani nel vento, il cuore a metà" },
  { id: "r4", title: "ultimo treno · 1", song: "ultimo treno", core: "fumo", addedAt: "2026-10-06", duration: 12, seed: 12, line: "torna la notte, resta con me" },
  { id: "r5", title: "carta e cenere · 1", song: "carta e cenere", core: "brace", addedAt: "2026-09-30", duration: 19, seed: 48, line: "scrivo il tuo nome sul vetro" },
  { id: "r6", title: "oro lento · 1", song: "oro lento", core: "tramonto", addedAt: "2026-09-24", duration: 16, seed: 33, line: "lasciamo le ombre al loro posto" },
  { id: "r7", title: "controvento · 1", song: "controvento", core: "scintille", addedAt: "2026-09-16", duration: 14, seed: 24, line: "una scintilla basta per ripartire" },
  { id: "r8", title: "stanza nove · 1", song: "stanza nove", core: "nebbia", addedAt: "2026-09-08", duration: 20, seed: 28, line: "domani sarà un'altra strada" },
];
