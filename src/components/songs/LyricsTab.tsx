"use client";

import { useState } from "react";
import { countTimed, parseLyricsText, type LyricLine } from "@/lib/lyrics";

type Props = {
  lines: LyricLine[];
  initialText: string;
  snippetCount: number;
  saving: boolean;
  msg: string;
  onSave: (text: string) => void;
};

export default function LyricsTab({ lines, initialText, snippetCount, saving, msg, onSave }: Props) {
  const [text, setText] = useState(initialText);
  const n = parseLyricsText(text).length;
  const changed = text !== initialText;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted">
        incolla il testo: una riga per verso (le righe vuote vengono ignorate)
        <textarea
          data-testid="lyrics-text"
          className="field min-h-64 w-full resize-y font-[inherit] text-sm leading-relaxed text-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder={"accendo le luci sul tetto\nla città respira più piano\n…"}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted" data-testid="lyrics-count">
          {n} {n === 1 ? "riga" : "righe"} · {countTimed(lines)} con tempo
        </p>
        <div className="flex items-center gap-2">
          <span role="status" data-testid="lyrics-status" className="text-xs text-muted">
            {msg}
          </span>
          <button type="button" className="btn border-accent text-accent" data-testid="lyrics-save" disabled={saving || (!changed && lines.length > 0)} onClick={() => onSave(text)}>
            {saving ? "salvo…" : "salva testo"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        modificando il testo, le righe rimaste uguali tengono il loro tempo; quelle nuove o cambiate vanno sincronizzate di nuovo.
        {snippetCount > 0 && " controlla gli snippet già salvati: usano i numeri di riga e i tempi di prima."}
      </p>
    </div>
  );
}
