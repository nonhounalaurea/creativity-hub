"use client";

import { memo, useEffect, useRef, useState } from "react";
import { NUDGE_SECONDS, REWIND_SECONDS } from "@/config/songs";
import { fmtSeconds } from "@/lib/format";
import { LAST_LINE_SECONDS, countTimed, type LyricLine } from "@/lib/lyrics";

const fmtField = (v: number | null) => (v == null ? "" : v.toFixed(2).replace(".", ","));

/** Campo numerico in secondi: conferma con invio o uscendo dal campo; accetta virgola o punto. */
export function TimeField({
  value,
  onCommit,
  label,
  testid,
  disabled,
}: {
  value: number | null;
  onCommit: (v: number) => void;
  label: string;
  testid?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(fmtField(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(fmtField(value));
  }, [value, focus]);
  const commit = () => {
    const n = parseFloat(text.replace(",", "."));
    if (Number.isFinite(n)) onCommit(n);
    else setText(fmtField(value));
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      data-testid={testid}
      disabled={disabled}
      value={text}
      placeholder="–"
      className="field w-[4.5rem] px-2 py-1 text-right text-xs tabular-nums"
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        setFocus(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocus(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setText(fmtField(value));
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

type RowProps = {
  i: number;
  line: LyricLine;
  active: boolean;
  isCursor: boolean;
  isSelected: boolean;
  onSelect: (i: number) => void;
  onCursor: (i: number) => void;
  onSetStart: (i: number, t: number) => void;
  onSetEnd: (i: number, t: number) => void;
  onNudge: (i: number, d: number) => void;
  onClear: (i: number) => void;
  onPlayFrom: (t: number) => void;
};

const LineRow = memo(function LineRow(p: RowProps) {
  const { i, line } = p;
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (p.isSelected || p.isCursor) ref.current?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.isSelected, p.isCursor]);
  const timed = line.start != null;
  return (
    <li
      ref={ref}
      data-testid={`line-${i}`}
      data-active={p.active || undefined}
      data-cursor={p.isCursor || undefined}
      data-selected={p.isSelected || undefined}
      className={`flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm ${
        p.isSelected ? "border-accent" : p.isCursor ? "border-dashed border-accent/70" : "border-border"
      } ${p.active ? "bg-bg" : ""}`}
      onClick={() => p.onSelect(i)}
    >
      <div className="flex items-start gap-2">
        <span className="w-6 shrink-0 pt-px text-right text-xs tabular-nums text-muted">{i + 1}</span>
        <span className={`min-w-0 flex-1 break-words ${p.active ? "text-accent" : timed ? "" : "text-muted"}`}>{line.text}</span>
        {p.isCursor && <span className="shrink-0 rounded-full border border-accent px-2 text-[11px] text-accent">prossima</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-8" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted">inizio</span>
        <TimeField label={`inizio riga ${i + 1} in secondi`} testid={`line-start-${i}`} value={line.start} onCommit={(v) => p.onSetStart(i, v)} />
        <button type="button" className="btn px-2 py-1 text-xs" data-testid={`line-minus-${i}`} disabled={!timed} aria-label={`riga ${i + 1} indietro di ${NUDGE_SECONDS} secondi`} onClick={() => p.onNudge(i, -NUDGE_SECONDS)}>
          −0,05
        </button>
        <button type="button" className="btn px-2 py-1 text-xs" data-testid={`line-plus-${i}`} disabled={!timed} aria-label={`riga ${i + 1} avanti di ${NUDGE_SECONDS} secondi`} onClick={() => p.onNudge(i, NUDGE_SECONDS)}>
          +0,05
        </button>
        <span className="ml-1 text-xs text-muted">fine</span>
        <TimeField label={`fine riga ${i + 1} in secondi`} testid={`line-end-${i}`} value={line.end} disabled={!timed} onCommit={(v) => p.onSetEnd(i, v)} />
        <span className="flex gap-1.5">
          <button type="button" className="btn px-2 py-1 text-xs" disabled={!timed} aria-label={`ascolta dalla riga ${i + 1}`} data-testid={`line-play-${i}`} onClick={() => p.onPlayFrom(Math.max(0, (line.start ?? 0) - 0.3))}>
            ▶
          </button>
          <button type="button" className="btn px-2 py-1 text-xs" data-testid={`line-cursor-${i}`} onClick={() => p.onCursor(i)}>
            sync da qui
          </button>
          <button type="button" className="btn px-2 py-1 text-xs" disabled={!timed} data-testid={`line-clear-${i}`} onClick={() => p.onClear(i)}>
            azzera
          </button>
        </span>
      </div>
    </li>
  );
});

type TapBarProps = {
  lines: LyricLine[];
  cursor: number;
  playing: boolean;
  canUndo: boolean;
  onTap: () => void;
  onUndo: () => void;
};

/** Barra fissa con il pulsante grande "tap to sync" (spazio da tastiera, tocco su mobile). */
export function TapBar({ lines, cursor, playing, canUndo, onTap, onUndo }: TapBarProps) {
  const done = lines.length > 0 && cursor >= lines.length;
  const next = lines[cursor]?.text;
  const label =
    lines.length === 0 ? "incolla prima il testo" : done ? "tutte le righe hanno un tempo" : playing ? "assegna riga" : "avvia la canzone";
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3" data-testid="tapbar">
      <p className="min-h-[2.5rem] text-sm leading-snug" data-testid="tap-next">
        {done || lines.length === 0 ? (
          <span className="text-muted">{done ? "puoi correggere i tempi qui sotto, poi salva" : "serve almeno una riga di testo"}</span>
        ) : (
          <>
            <span className="text-xs text-muted">
              riga {cursor + 1}/{lines.length}
            </span>
            <br />
            <span className="font-medium">{next}</span>
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="tap-button"
          disabled={lines.length === 0 || done}
          // pointerdown = meno ritardo sul touch; da tastiera (invio) arriva il click con detail 0
          onPointerDown={(e) => {
            if (e.button === 0 || e.pointerType === "touch") {
              e.preventDefault();
              onTap();
            }
          }}
          onClick={(e) => {
            if (e.detail === 0) onTap();
          }}
          className="min-h-14 flex-1 touch-manipulation select-none rounded-xl bg-accent px-4 text-base font-semibold text-bg transition-opacity enabled:active:opacity-80 disabled:cursor-not-allowed disabled:bg-bg disabled:text-muted disabled:ring-1 disabled:ring-border"
        >
          {label}
        </button>
        <button type="button" className="btn min-h-14 px-4" data-testid="undo" disabled={!canUndo} onClick={onUndo}>
          annulla
        </button>
      </div>
    </div>
  );
}

export const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: "spazio", what: "avvia la canzone, poi assegna il tempo alla riga prossima" },
  { keys: "p", what: "play / pausa" },
  { keys: "r", what: `riavvolgi di ${REWIND_SECONDS} s` },
  { keys: "z", what: "annulla l'ultima modifica" },
  { keys: "↑ ↓", what: "seleziona la riga precedente / successiva" },
  { keys: "← →", what: `sposta la riga selezionata di ${String(NUDGE_SECONDS).replace(".", ",")} s (con maiusc 0,5 s)` },
  { keys: "+ −", what: "zoom della forma d'onda" },
];

export function ShortcutLegend() {
  return (
    <details className="card p-3 text-sm" data-testid="shortcuts" open>
      <summary className="cursor-pointer text-xs font-semibold">scorciatoie da tastiera</summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5 text-xs">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="contents">
            <dt>
              <kbd className="rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px]">{s.keys}</kbd>
            </dt>
            <dd className="text-muted">{s.what}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">le scorciatoie sono disattivate mentre scrivi in un campo di testo. su touch usa il pulsante grande.</p>
    </details>
  );
}

type Props = {
  lines: LyricLine[];
  cursor: number;
  selected: number;
  activeLine: number;
  dirty: boolean;
  saving: boolean;
  saveMsg: string;
  onSelect: (i: number) => void;
  onCursor: (i: number) => void;
  onSetStart: (i: number, t: number) => void;
  onSetEnd: (i: number, t: number) => void;
  onNudge: (i: number, d: number) => void;
  onClear: (i: number) => void;
  onClearAll: () => void;
  onPlayFrom: (t: number) => void;
  onSave: () => void;
};

export default function SyncTab(p: Props) {
  const timed = countTimed(p.lines);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm" data-testid="sync-count">
          {timed}/{p.lines.length} righe con tempo
          {p.lines.length > 0 && timed === p.lines.length && <span className="ml-2 text-accent">testo pronto</span>}
        </p>
        <div className="flex items-center gap-2">
          <span role="status" data-testid="sync-status" className="text-xs text-muted">
            {p.saveMsg || (p.dirty ? "modifiche non salvate" : "")}
          </span>
          <button type="button" className="btn" data-testid="sync-clear-all" disabled={timed === 0} onClick={p.onClearAll}>
            azzera tutti
          </button>
          <button type="button" className="btn border-accent text-accent" data-testid="sync-save" disabled={!p.dirty || p.saving} onClick={p.onSave}>
            {p.saving ? "salvo…" : "salva tempi"}
          </button>
        </div>
      </div>

      {p.lines.length === 0 ? (
        <div className="card py-8 text-center text-sm text-muted" data-testid="sync-empty">
          nessun testo: incollalo nella scheda “testo”, una riga per verso.
        </div>
      ) : (
        <ol className="flex flex-col gap-2" data-testid="sync-lines">
          {p.lines.map((l, i) => (
            <LineRow
              key={i}
              i={i}
              line={l}
              active={p.activeLine === i}
              isCursor={p.cursor === i}
              isSelected={p.selected === i}
              onSelect={p.onSelect}
              onCursor={p.onCursor}
              onSetStart={p.onSetStart}
              onSetEnd={p.onSetEnd}
              onNudge={p.onNudge}
              onClear={p.onClear}
              onPlayFrom={p.onPlayFrom}
            />
          ))}
        </ol>
      )}
      <ShortcutLegend />
      <p className="text-xs text-muted">durata fine = inizio della riga dopo; l&apos;ultima riga dura {fmtSeconds(LAST_LINE_SECONDS, 0)} al massimo.</p>
    </div>
  );
}
