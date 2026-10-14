import { describe, expect, it } from "vitest";
import { MAX_DURATION_SECONDS } from "@/config/format";
import {
  LAST_LINE_SECONDS,
  clampToMax,
  clearLineTime,
  countTimed,
  deriveEnds,
  finalizeLyrics,
  fitSnippetToMax,
  isFullySynced,
  isMonotonic,
  isOverMax,
  lineAtTime,
  linesFromText,
  nudgeLineStart,
  parseLyricsDoc,
  parseLyricsText,
  setLineEnd,
  setLineStart,
  snippetDuration,
  snippetRange,
  splitWords,
  tapLine,
  type LyricLine,
} from "./lyrics";

const L = (text: string, start: number | null = null, end: number | null = null): LyricLine => ({ text, start, end });
const untimed = (...t: string[]) => t.map((x) => L(x));

describe("parseLyricsText", () => {
  it("una riga per verso, scarta righe vuote e normalizza gli spazi", () => {
    expect(parseLyricsText("  ciao   mondo \n\n\n  secondo verso\r\nterzo\r\n")).toEqual(["ciao mondo", "secondo verso", "terzo"]);
  });
  it("testo vuoto o solo spazi = nessuna riga", () => {
    expect(parseLyricsText("")).toEqual([]);
    expect(parseLyricsText(" \n \t \n")).toEqual([]);
  });
  it("una sola riga", () => {
    expect(parseLyricsText("solo questa")).toEqual(["solo questa"]);
  });
});

describe("linesFromText", () => {
  const prev = [L("a", 1, 2), L("b", 2, 3), L("c", 3, 4)];
  it("conserva i tempi delle righe invariate", () => {
    const out = linesFromText("a\nb\nc", prev, 10);
    expect(out.map((l) => l.start)).toEqual([1, 2, 3]);
  });
  it("una riga modificata perde il tempo, le altre no", () => {
    const out = linesFromText("a\nB nuova\nc", prev, 10);
    expect(out.map((l) => l.start)).toEqual([1, null, 3]);
  });
  it("una riga spostata mantiene il tempo per testo uguale", () => {
    const out = linesFromText("nuova\na\nb\nc", prev, 10);
    expect(out.map((l) => l.start)).toEqual([null, 1, 2, 3]);
  });
  it("righe duplicate: corrispondenza per posizione prima, poi per testo", () => {
    const p = [L("oh", 1), L("x", 2), L("oh", 3)];
    const out = linesFromText("oh\noh\noh", p, 10);
    expect(out.map((l) => l.start)).toEqual([1, null, 3]);
  });
  it("righe vuote ignorate e testo vuoto -> nessuna riga", () => {
    expect(linesFromText("\n\n", prev)).toEqual([]);
  });
});

describe("splitWords", () => {
  it("tempi proporzionali alla lunghezza, primo inizio e ultima fine esatti", () => {
    const w = splitWords("ciao mondo", 10, 12);
    expect(w).toHaveLength(2);
    expect(w[0].start).toBe(10);
    expect(w[1].end).toBe(12);
    expect(w[0].end).toBe(w[1].start);
    expect(w[0].end).toBeCloseTo(10 + (2 * 4) / 9, 2); // 'ciao' pesa 4, 'mondo' 5
  });
  it("parole di lunghezza diversa pesano diversamente", () => {
    const w = splitWords("a bbbb", 0, 5); // pesi 1 e 4
    expect(w[0].end).toBeCloseTo(1, 5);
    expect(w[1].end).toBe(5);
  });
  it("una parola sola occupa tutto l'intervallo", () => {
    expect(splitWords("ciao", 3, 4)).toEqual([{ text: "ciao", start: 3, end: 4 }]);
  });
  it("testo vuoto -> nessuna parola; fine prima dell'inizio -> durata zero", () => {
    expect(splitWords("   ", 0, 1)).toEqual([]);
    const w = splitWords("uno due", 5, 3);
    expect(w[0].start).toBe(5);
    expect(w[1].end).toBe(5);
  });
  it("punteggiatura isolata pesa almeno 1", () => {
    const w = splitWords("sì — no", 0, 3);
    expect(w).toHaveLength(3);
    expect(w[2].end).toBe(3);
    for (const x of w) expect(x.end).toBeGreaterThanOrEqual(x.start);
  });
});

describe("deriveEnds", () => {
  it("end = inizio della riga successiva; ultima = start + LAST_LINE_SECONDS", () => {
    const out = deriveEnds([L("a", 1), L("b", 4), L("c", 9)], 100);
    expect(out.map((l) => l.end)).toEqual([4, 9, 9 + LAST_LINE_SECONDS]);
  });
  it("l'ultima riga non supera la durata del brano", () => {
    expect(deriveEnds([L("a", 1), L("b", 4)], 6)[1].end).toBe(6);
  });
  it("una sola riga", () => {
    expect(deriveEnds([L("a", 2)], 100)).toEqual([L("a", 2, 2 + LAST_LINE_SECONDS)]);
    expect(deriveEnds([L("a", 2)], 0)[0].end).toBe(2 + LAST_LINE_SECONDS); // durata sconosciuta
  });
  it("righe senza tempo restano senza fine e vengono saltate", () => {
    const out = deriveEnds([L("a", 1), L("b"), L("c", 5)], 100);
    expect(out[0].end).toBe(5);
    expect(out[1]).toEqual(L("b"));
  });
  it("tempi non monotoni: nessuna fine prima dell'inizio", () => {
    const out = deriveEnds([L("a", 5), L("b", 3), L("c", 8)], 100);
    for (const l of out) expect(l.end as number).toBeGreaterThanOrEqual(l.start as number);
    expect(out[0].end).toBe(5);
  });
  it("conserva una fine manuale valida, scarta quella non valida", () => {
    expect(deriveEnds([L("a", 1, 2.5), L("b", 4)], 100)[0].end).toBe(2.5);
    expect(deriveEnds([L("a", 1, 9), L("b", 4)], 100)[0].end).toBe(4); // oltre la successiva
    expect(deriveEnds([L("a", 1, 0.5), L("b", 4)], 100)[0].end).toBe(4); // prima dell'inizio
  });
  it("non muta l'input", () => {
    const input = [L("a", 1), L("b", 2)];
    const copy = JSON.parse(JSON.stringify(input));
    deriveEnds(input, 10);
    expect(input).toEqual(copy);
  });
});

describe("tapLine / assegnazione tempi", () => {
  it("assegna in sequenza e deriva le fini", () => {
    let l = untimed("a", "b", "c");
    l = tapLine(l, 0, 1.2, 60);
    l = tapLine(l, 1, 4.5, 60);
    l = tapLine(l, 2, 8, 60);
    expect(l.map((x) => x.start)).toEqual([1.2, 4.5, 8]);
    expect(l.map((x) => x.end)).toEqual([4.5, 8, 13]);
    expect(isFullySynced(l)).toBe(true);
  });
  it("tap prima della riga precedente viene portato alla precedente (ordine mai invertito)", () => {
    let l = tapLine(untimed("a", "b"), 0, 5, 60);
    l = tapLine(l, 1, 2, 60);
    expect(l[1].start).toBe(5);
    expect(isMonotonic(l)).toBe(true);
  });
  it("tap oltre la durata viene limitato alla durata", () => {
    const l = tapLine(untimed("a"), 0, 999, 30);
    expect(l[0].start).toBe(30);
  });
  it("ri-sincronizzando da una riga a metà azzera le successive già superate", () => {
    let l = deriveEnds([L("a", 1), L("b", 3), L("c", 5), L("d", 20)], 60);
    l = tapLine(l, 1, 6, 60);
    expect(l.map((x) => x.start)).toEqual([1, 6, null, 20]);
  });
  it("indice fuori intervallo o tempo non finito: nessun cambiamento", () => {
    const l = untimed("a");
    expect(tapLine(l, 3, 1, 10)).toBe(l);
    expect(tapLine(l, -1, 1, 10)).toBe(l);
    expect(tapLine(l, 0, NaN, 10)).toBe(l);
  });
  it("la fine della riga precedente segue il nuovo inizio", () => {
    let l = tapLine(untimed("a", "b"), 0, 1, 60);
    l = tapLine(l, 1, 4, 60);
    expect(l[0].end).toBe(4);
    l = setLineStart(l, 1, 6, 60);
    expect(l[0].end).toBe(6);
  });
});

describe("setLineStart / nudge / end / clear", () => {
  const base = deriveEnds([L("a", 1), L("b", 4), L("c", 9)], 60);
  it("resta tra le righe vicine", () => {
    expect(setLineStart(base, 1, 100, 60)[1].start).toBe(9);
    expect(setLineStart(base, 1, -5, 60)[1].start).toBe(1);
  });
  it("nudge di 0,05 senza errori di virgola mobile", () => {
    let l = base;
    for (let k = 0; k < 3; k++) l = nudgeLineStart(l, 1, 0.05, 60);
    expect(l[1].start).toBe(4.15);
    expect(nudgeLineStart(l, 1, -0.05, 60)[1].start).toBe(4.1);
  });
  it("nudge su riga senza tempo non fa nulla", () => {
    const l = untimed("a");
    expect(nudgeLineStart(l, 0, 0.05, 10)).toBe(l);
  });
  it("prima riga non può andare sotto zero", () => {
    expect(setLineStart(base, 0, -3, 60)[0].start).toBe(0);
  });
  it("setLineEnd: tra inizio+min e inizio della successiva", () => {
    expect(setLineEnd(base, 0, 2.5, 60)[0].end).toBe(2.5);
    expect(setLineEnd(base, 0, 50, 60)[0].end).toBe(4);
    expect(setLineEnd(base, 0, 0, 60)[0].end).toBeCloseTo(1.05, 5);
  });
  it("una fine manuale sopravvive allo spostamento della riga successiva se resta valida", () => {
    let l = setLineEnd(base, 0, 2.5, 60);
    l = setLineStart(l, 1, 5, 60);
    expect(l[0].end).toBe(2.5);
  });
  it("clearLineTime azzera e ripristina la fine di default della precedente", () => {
    const l = clearLineTime(base, 2, 60);
    expect(l[2]).toEqual(L("c"));
    expect(l[1].end).toBe(4 + LAST_LINE_SECONDS);
    expect(countTimed(l)).toBe(2);
  });
});

describe("stato e ricerca riga", () => {
  it("isFullySynced: false per lista vuota o con righe senza tempo", () => {
    expect(isFullySynced([])).toBe(false);
    expect(isFullySynced([L("a", 1), L("b")])).toBe(false);
    expect(isFullySynced([L("a", 1)])).toBe(true);
  });
  it("isMonotonic ignora le righe senza tempo", () => {
    expect(isMonotonic([L("a", 1), L("b"), L("c", 3)])).toBe(true);
    expect(isMonotonic([L("a", 3), L("b", 1)])).toBe(false);
  });
  it("lineAtTime", () => {
    const l = deriveEnds([L("a", 1), L("b", 4)], 8);
    expect(lineAtTime(l, 0)).toBe(-1);
    expect(lineAtTime(l, 1)).toBe(0);
    expect(lineAtTime(l, 3.99)).toBe(0);
    expect(lineAtTime(l, 4)).toBe(1);
    expect(lineAtTime(l, 7)).toBe(1);
    expect(lineAtTime(l, 8)).toBe(-1); // ultima riga finita (fine = durata)
  });
});

describe("snippet", () => {
  const lines = deriveEnds([L("a", 0), L("b", 5), L("c", 12), L("d", 18), L("e", 30)], 60);
  it("durata e intervallo", () => {
    expect(snippetRange(lines, 1, 2)).toEqual({ start: 5, end: 18 });
    expect(snippetDuration(lines, 1, 2)).toBe(13);
  });
  it("una sola riga e ultima riga", () => {
    expect(snippetDuration(lines, 0, 0)).toBe(5);
    expect(snippetDuration(lines, 4, 4)).toBe(LAST_LINE_SECONDS);
  });
  it("input non valido -> null", () => {
    expect(snippetRange(lines, 3, 1)).toBeNull();
    expect(snippetRange(lines, -1, 1)).toBeNull();
    expect(snippetRange(lines, 0, 9)).toBeNull();
    expect(snippetRange(lines, 0.5, 1)).toBeNull();
    expect(snippetRange([L("a", 1), L("b")], 0, 1)).toBeNull(); // riga senza tempo
    expect(snippetRange([L("a", 5, 5)], 0, 0)).toBeNull(); // durata zero
  });
  it("oltre 20 s è rilevato e clampato", () => {
    expect(MAX_DURATION_SECONDS).toBe(20);
    expect(isOverMax(20)).toBe(false);
    expect(isOverMax(20.01)).toBe(true);
    expect(clampToMax(35)).toBe(20);
    expect(clampToMax(7)).toBe(7);
    expect(snippetDuration(lines, 0, 3)).toBe(30);
  });
  it("fitSnippetToMax accorcia all'ultima riga che ci sta", () => {
    const f = fitSnippetToMax(lines, 0, 4)!; // 0..35 -> righe 0..2 finiscono a 18
    expect(f).toEqual({ from: 0, to: 2, start: 0, end: 18, truncated: true });
    expect(f.end - f.start).toBeLessThanOrEqual(MAX_DURATION_SECONDS);
  });
  it("fitSnippetToMax non cambia uno snippet già valido", () => {
    expect(fitSnippetToMax(lines, 1, 2)).toEqual({ from: 1, to: 2, start: 5, end: 18, truncated: false });
  });
  it("fitSnippetToMax con una prima riga più lunga di 20 s taglia a start + 20", () => {
    const long = deriveEnds([L("a", 2), L("b", 40)], 60);
    expect(fitSnippetToMax(long, 0, 1)).toEqual({ from: 0, to: 0, start: 2, end: 22, truncated: true });
  });
  it("fitSnippetToMax con limite esatto di 20 s", () => {
    const l = deriveEnds([L("a", 0), L("b", 20), L("c", 25)], 60);
    expect(fitSnippetToMax(l, 0, 1)!.to).toBe(0); // fine riga a = 20 ok, b finirebbe a 25
    expect(fitSnippetToMax(l, 0, 0)!.truncated).toBe(false);
  });
  it("fitSnippetToMax -> null se i tempi mancano", () => {
    expect(fitSnippetToMax(untimed("a", "b"), 0, 1)).toBeNull();
  });
});

describe("serializzazione", () => {
  it("finalizeLyrics: version 1, fini derivate e parole sulle righe con tempo", () => {
    const doc = finalizeLyrics([L("ciao mondo", 1), L("secondo")], 20);
    expect(doc.version).toBe(1);
    expect(doc.lines[0].end).toBe(1 + LAST_LINE_SECONDS); // la seconda non ha tempo
    expect(doc.lines[0].words).toHaveLength(2);
    expect(doc.lines[1]).toEqual({ text: "secondo", start: null, end: null });
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
  it("parseLyricsDoc: round trip e scarto dei dati non validi", () => {
    const doc = finalizeLyrics([L("a b", 1), L("c", 3)], 20);
    const back = parseLyricsDoc(doc)!;
    expect(back.map((l) => [l.text, l.start, l.end])).toEqual([["a b", 1, 3], ["c", 3, 8]]);
    expect(back[0].words).toHaveLength(2);
    expect(parseLyricsDoc(null)).toBeNull();
    expect(parseLyricsDoc({ version: 2, lines: [] })).toBeNull();
    expect(parseLyricsDoc({ version: 1, lines: [{ start: 1 }] })).toBeNull();
    expect(parseLyricsDoc({ version: 1, lines: "no" })).toBeNull();
    expect(parseLyricsDoc({ version: 1, lines: [] })).toEqual([]);
    expect(parseLyricsDoc({ version: 1, lines: [{ text: "x", start: "1", end: 2 }] })).toEqual([{ text: "x", start: null, end: null }]);
  });
});
