"use client";

import { useEffect, useState } from "react";
import { MAX_DURATION_SECONDS } from "@/config/format";
import { fmtSeconds, fmtTime } from "@/lib/format";
import {
  fitSnippetToMax,
  isFullySynced,
  isOverMax,
  lineAtTime,
  snippetDuration,
  snippetRange,
  type LyricLine,
} from "@/lib/lyrics";
import type { SnippetRow } from "@/lib/songs";

export type Sel = { from: number; to: number };

type Props = {
  lines: LyricLine[];
  time: number;
  sel: Sel | null;
  setSel: (s: Sel | null) => void;
  snippets: SnippetRow[];
  dirty: boolean;
  rangePlaying: { start: number; end: number } | null;
  onPlayRange: (start: number, end: number) => void;
  onStop: () => void;
  onAdd: (s: { from_line: number; to_line: number; start_seconds: number; end_seconds: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const label = (lines: LyricLine[], i: number) => `${i + 1} · ${lines[i]?.start != null ? fmtTime(lines[i].start as number) : "–:––"} · ${lines[i]?.text ?? ""}`;

export default function SnippetsTab(p: Props) {
  const { lines, sel, setSel } = p;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // selezione iniziale: dalla prima riga, già adattata al massimo
  useEffect(() => {
    if (sel || lines.length === 0 || lines[0].start == null) return;
    const f = fitSnippetToMax(lines, 0, lines.length - 1);
    setSel({ from: 0, to: f ? f.to : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  const synced = isFullySynced(lines);
  const timedCount = lines.filter((l) => l.start != null).length;
  if (lines.length === 0 || timedCount === 0) {
    return (
      <div className="card py-8 text-center text-sm text-muted" data-testid="snippets-blocked">
        per scegliere uno snippet servono righe con il tempo: incolla il testo e sincronizzalo.
      </div>
    );
  }

  const range = sel ? snippetRange(lines, sel.from, sel.to) : null;
  const dur = sel ? snippetDuration(lines, sel.from, sel.to) : null;
  const over = dur != null && isOverMax(dur);
  const invalid = sel != null && range == null;

  const setFrom = (i: number) => setSel({ from: i, to: Math.max(i, sel?.to ?? i) });
  const setTo = (i: number) => setSel({ from: Math.min(i, sel?.from ?? i), to: i });
  const pick = (i: number) => {
    if (lines[i].start == null) return;
    if (!sel || sel.from !== sel.to || i < sel.from) setSel({ from: i, to: i });
    else setSel({ from: sel.from, to: i });
  };
  const here = lineAtTime(lines, p.time);

  async function save() {
    if (!sel || !range || over) return;
    setBusy(true);
    setMsg("");
    try {
      await p.onAdd({ from_line: sel.from, to_line: sel.to, start_seconds: range.start, end_seconds: range.end });
      setMsg("snippet salvato");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "non riesco a salvare lo snippet");
    } finally {
      setBusy(false);
    }
  }

  const selecting = (v: number | undefined) => (v === undefined ? "" : String(v));

  return (
    <div className="flex flex-col gap-4">
      {!synced && (
        <p className="text-xs text-muted" data-testid="snippets-partial">
          alcune righe non hanno ancora un tempo: puoi scegliere solo tra quelle sincronizzate.
        </p>
      )}
      {p.dirty && <p className="text-xs text-muted">hai tempi non salvati: salvali nella scheda sync per tenerli.</p>}

      <section className="card flex flex-col gap-3" aria-label="nuovo snippet">
        <h2 className="text-sm font-semibold">nuovo snippet</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["da", "a"] as const).map((k) => (
            <label key={k} className="flex min-w-0 items-center gap-2 text-sm">
              <span className="w-6 text-muted">{k}</span>
              <select
                data-testid={`snippet-${k}`}
                className="field min-w-0 flex-1"
                value={selecting(k === "da" ? sel?.from : sel?.to)}
                onChange={(e) => (k === "da" ? setFrom(Number(e.target.value)) : setTo(Number(e.target.value)))}
              >
                {sel == null && <option value="">scegli una riga</option>}
                {lines.map((l, i) => (
                  <option key={i} value={i} disabled={l.start == null}>
                    {label(lines, i)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" data-testid="snippet-from-here" disabled={here < 0} onClick={() => here >= 0 && setFrom(here)}>
            inizia dalla riga sotto il cursore
          </button>
          <button type="button" className="btn" data-testid="snippet-to-here" disabled={here < 0} onClick={() => here >= 0 && setTo(here)}>
            finisci alla riga sotto il cursore
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
          <p className={`text-sm ${over ? "font-medium text-text" : "text-muted"}`} data-testid="snippet-duration">
            {dur != null ? (
              <>
                durata {fmtSeconds(dur)} · max {MAX_DURATION_SECONDS} s
              </>
            ) : invalid ? (
              "le righe scelte non hanno tutte un tempo valido"
            ) : (
              "scegli le righe"
            )}
          </p>
          {over && (
            <button
              type="button"
              className="btn border-accent text-accent"
              data-testid="snippet-fit"
              onClick={() => {
                const f = sel && fitSnippetToMax(lines, sel.from, sel.to);
                if (f) setSel({ from: f.from, to: f.to });
              }}
            >
              adatta a {MAX_DURATION_SECONDS} s
            </button>
          )}
        </div>
        {over && (
          <p role="alert" data-testid="snippet-over" className="text-xs text-text">
            lo snippet supera i {MAX_DURATION_SECONDS} secondi e non si può salvare: accorcialo o usa “adatta a {MAX_DURATION_SECONDS} s”.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn"
            data-testid="snippet-preview-selection"
            disabled={!range}
            onClick={() => {
              if (!range) return;
              if (p.rangePlaying) p.onStop();
              else p.onPlayRange(range.start, Math.min(range.end, range.start + MAX_DURATION_SECONDS));
            }}
          >
            {p.rangePlaying ? "stop" : "ascolta selezione"}
          </button>
          <button type="button" className="btn border-accent text-accent" data-testid="snippet-save" disabled={!range || over || busy} onClick={save}>
            {busy ? "salvo…" : "salva snippet"}
          </button>
          <span role="status" data-testid="snippet-msg" className="text-xs text-muted">
            {msg}
          </span>
        </div>

        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" data-testid="snippet-lines" aria-label="righe: clicca per scegliere inizio e fine">
          {lines.map((l, i) => {
            const inSel = sel != null && i >= sel.from && i <= sel.to;
            return (
              <li key={i}>
                <button
                  type="button"
                  data-testid={`snippet-line-${i}`}
                  aria-pressed={inSel}
                  disabled={l.start == null}
                  onClick={() => pick(i)}
                  className={`flex w-full items-baseline gap-2 rounded-lg border px-2 py-1.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                    inSel ? "border-accent bg-bg text-accent" : "border-transparent text-muted hover:text-text"
                  }`}
                >
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 break-words">{l.text}</span>
                  <span className="shrink-0 text-xs tabular-nums">{l.start != null ? fmtTime(l.start) : "–"}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted">clic su una riga = inizio; un secondo clic su una riga successiva = fine.</p>
      </section>

      <section className="flex flex-col gap-2" aria-label="snippet salvati">
        <h2 className="text-sm font-semibold">snippet salvati</h2>
        {p.snippets.length === 0 ? (
          <p className="card py-6 text-center text-sm text-muted" data-testid="snippets-empty">
            nessuno snippet salvato per questa canzone
          </p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="snippet-list">
            {p.snippets.map((s) => {
              const playing = p.rangePlaying?.start === s.start_seconds && p.rangePlaying?.end === s.end_seconds;
              return (
                <li key={s.id} data-testid="snippet-item" className="card flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      {lines[s.from_line]?.text ?? `riga ${s.from_line + 1}`}
                      {s.to_line !== s.from_line && <span className="text-muted"> … {lines[s.to_line]?.text ?? `riga ${s.to_line + 1}`}</span>}
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      righe {s.from_line + 1}–{s.to_line + 1} · {fmtSeconds(s.start_seconds)} → {fmtSeconds(s.end_seconds)} ·{" "}
                      {fmtSeconds(s.end_seconds - s.start_seconds)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn"
                      data-testid="snippet-play"
                      onClick={() => (playing ? p.onStop() : p.onPlayRange(s.start_seconds, s.end_seconds))}
                    >
                      {playing ? "stop" : "ascolta"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      data-testid="snippet-delete"
                      onClick={async () => {
                        if (confirmId !== s.id) {
                          setConfirmId(s.id);
                          window.setTimeout(() => setConfirmId((c) => (c === s.id ? null : c)), 4000);
                          return;
                        }
                        setConfirmId(null);
                        try {
                          await p.onDelete(s.id);
                        } catch (e) {
                          setMsg(e instanceof Error ? e.message : "non riesco a eliminare lo snippet");
                        }
                      }}
                    >
                      {confirmId === s.id ? "confermi?" : "elimina"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
