"use client";

import { useCallback, useReducer, useRef } from "react";
import {
  clearAllTimes,
  clearLineTime,
  deriveEnds,
  nudgeLineStart,
  setLineEnd,
  setLineStart,
  tapLine,
  type LyricLine,
} from "@/lib/lyrics";

type Snap = { lines: LyricLine[]; cursor: number; selected: number };
type State = Snap & { history: Snap[]; dirty: boolean };
type Action =
  | { type: "reset"; lines: LyricLine[]; dirty?: boolean }
  | { type: "edit"; fn: (lines: LyricLine[]) => LyricLine[]; selected?: number; cursor?: number }
  | { type: "tap"; time: number; duration: number }
  | { type: "undo" }
  | { type: "select"; i: number }
  | { type: "cursor"; i: number }
  | { type: "saved" };

const firstUntimed = (lines: LyricLine[]) => {
  const i = lines.findIndex((l) => l.start == null);
  return i < 0 ? lines.length : i;
};

function init(lines: LyricLine[]): State {
  return { lines, cursor: firstUntimed(lines), selected: 0, history: [], dirty: false };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reset":
      return { ...init(a.lines), dirty: a.dirty ?? false };
    case "edit": {
      const lines = a.fn(s.lines);
      if (lines === s.lines && a.cursor === undefined) return a.selected === undefined ? s : { ...s, selected: a.selected };
      const snap: Snap = { lines: s.lines, cursor: s.cursor, selected: s.selected };
      return {
        lines,
        cursor: a.cursor ?? s.cursor,
        selected: a.selected ?? s.selected,
        history: [...s.history.slice(-99), snap],
        dirty: true,
      };
    }
    case "tap": {
      if (s.cursor >= s.lines.length) return s;
      const snap: Snap = { lines: s.lines, cursor: s.cursor, selected: s.selected };
      return {
        lines: tapLine(s.lines, s.cursor, a.time, a.duration),
        cursor: s.cursor + 1,
        selected: s.cursor,
        history: [...s.history.slice(-99), snap],
        dirty: true,
      };
    }
    case "undo": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...prev, history: s.history.slice(0, -1), dirty: true };
    }
    case "select":
      return { ...s, selected: Math.min(Math.max(0, a.i), Math.max(0, s.lines.length - 1)) };
    case "cursor":
      return { ...s, cursor: Math.min(Math.max(0, a.i), s.lines.length) };
    case "saved":
      return { ...s, dirty: false };
  }
}

/** Stato dell'editor di sincronizzazione: righe, riga corrente (prossima da assegnare), selezione e annulla. */
export function useLyricsEditor(initial: LyricLine[], duration: number) {
  const [s, dispatch] = useReducer(reducer, initial, (l) => init(deriveEnds(l, duration)));
  const dur = useRef(duration);
  dur.current = duration;
  const st = useRef(s);
  st.current = s;

  /** Assegna il tempo alla riga corrente e passa alla successiva. Restituisce l'indice assegnato o -1. */
  const tap = useCallback((time: number): number => {
    const { lines, cursor } = st.current;
    if (cursor >= lines.length) return -1;
    dispatch({ type: "tap", time, duration: dur.current });
    return cursor;
  }, []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const select = useCallback((i: number) => dispatch({ type: "select", i }), []);
  const setCursor = useCallback((i: number) => dispatch({ type: "cursor", i }), []);
  const setStart = useCallback((i: number, t: number) => {
    dispatch({ type: "edit", fn: (l) => setLineStart(l, i, t, dur.current), selected: i });
  }, []);
  const nudge = useCallback((i: number, delta: number) => {
    dispatch({ type: "edit", fn: (l) => nudgeLineStart(l, i, delta, dur.current), selected: i });
  }, []);
  const setEnd = useCallback((i: number, t: number) => {
    dispatch({ type: "edit", fn: (l) => setLineEnd(l, i, t, dur.current), selected: i });
  }, []);
  const clear = useCallback((i: number) => {
    dispatch({ type: "edit", fn: (l) => clearLineTime(l, i, dur.current), selected: i });
  }, []);
  const clearAll = useCallback(() => {
    dispatch({ type: "edit", fn: clearAllTimes, cursor: 0, selected: 0 });
  }, []);
  const reset = useCallback((lines: LyricLine[], dirty = false) => dispatch({ type: "reset", lines: deriveEnds(lines, dur.current), dirty }), []);
  const markSaved = useCallback(() => dispatch({ type: "saved" }), []);

  return {
    lines: s.lines,
    cursor: s.cursor,
    selected: s.selected,
    dirty: s.dirty,
    canUndo: s.history.length > 0,
    tap,
    undo,
    select,
    setCursor,
    setStart,
    nudge,
    setEnd,
    clear,
    clearAll,
    reset,
    markSaved,
  };
}
