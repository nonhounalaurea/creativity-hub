"use client";

import { useState } from "react";
import Preview from "@/components/Preview";
import { MAX_DURATION_SECONDS } from "@/config/format";
import { fmtTime, pick } from "@/lib/format";
import { CORES } from "@/mock/cores";
import { DROPDOWN_SONGS, LINE_SECONDS } from "@/mock/songs";

type Props = {
  songId: string;
  onSong: (id: string) => void;
  range: [number, number];
  onRange: (r: [number, number]) => void;
  coreIds: string[];
  onCores: (ids: string[]) => void;
};

export default function SongCorePanel({ songId, onSong, range, onRange, coreIds, onCores }: Props) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"recent" | "mine">("recent");

  const song = DROPDOWN_SONGS.find((s) => s.id === songId);
  const seconds = (range[1] - range[0] + 1) * LINE_SECONDS;

  const cores =
    tab === "recent"
      ? [...CORES].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 8)
      : CORES.filter((c) => c.mine);

  function clickCore(id: string, shift: boolean) {
    if (shift) onCores(coreIds.includes(id) ? coreIds.filter((x) => x !== id) : [...coreIds, id]);
    else onCores(coreIds.length === 1 && coreIds[0] === id ? [] : [id]);
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="canzone e core">
      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">canzone</h2>
        <div className="flex gap-2">
          <select
            data-testid="song-select"
            aria-label="canzone"
            className="field min-w-0 flex-1"
            value={songId}
            onChange={(e) => {
              onSong(e.target.value);
              setEditing(false);
            }}
          >
            <option value="">scegli una canzone</option>
            {DROPDOWN_SONGS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.artist}
              </option>
            ))}
          </select>
          <button type="button" className="btn" data-testid="song-shuffle" onClick={() => onSong(pick(DROPDOWN_SONGS).id)}>
            shuffle
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" data-testid="upload-song" onClick={() => setNote("il caricamento arriva nella prossima fase")}>
            carica canzone
          </button>
          {note && <span className="text-xs text-muted">{note}</span>}
        </div>

        {song && (
          <div data-testid="segment" className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
            {editing ? (
              <div className="flex flex-col gap-2">
                {(["da", "a"] as const).map((label, k) => (
                  <label key={label} className="flex items-center gap-2">
                    <span className="w-6 text-muted">{label}</span>
                    <select
                      data-testid={`segment-${label}`}
                      className="field min-w-0 flex-1"
                      value={range[k]}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        onRange(k === 0 ? [v, Math.max(v, range[1])] : [Math.min(v, range[0]), v]);
                      }}
                    >
                      {song.lyrics.map((l, i) => (
                        <option key={i} value={i}>
                          {fmtTime(l.t)} · {l.text}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <p className="flex gap-2">
                  <span className="w-6 text-muted">da</span>
                  <span data-testid="segment-from" className="min-w-0">{song.lyrics[range[0]].text}</span>
                </p>
                <p className="flex gap-2">
                  <span className="w-6 text-muted">a</span>
                  <span data-testid="segment-to" className="min-w-0">{song.lyrics[range[1]].text}</span>
                </p>
              </>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs ${seconds > MAX_DURATION_SECONDS ? "text-text" : "text-muted"}`}>
                {seconds} s · max {MAX_DURATION_SECONDS} s{seconds > MAX_DURATION_SECONDS ? " (verrà tagliato)" : ""}
              </span>
              <button type="button" className="btn" data-testid="segment-edit" onClick={() => setEditing((v) => !v)}>
                {editing ? "fatto" : "modifica"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">core</h2>
          <button
            type="button"
            className="btn"
            data-testid="core-shuffle"
            onClick={() => onCores([pick(cores).id])}
          >
            shuffle
          </button>
        </div>
        <div className="flex gap-1 text-sm" role="tablist">
          {(["recent", "mine"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              data-testid={`core-tab-${t}`}
              onClick={() => setTab(t)}
              className={`rounded-lg border px-3 py-1 ${tab === t ? "border-border bg-bg text-accent" : "border-transparent text-muted"}`}
            >
              {t === "recent" ? "recenti" : "i miei core"}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-2" data-testid="core-grid">
          {cores.map((c) => {
            const sel = coreIds.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  data-testid={`core-${c.id}`}
                  aria-pressed={sel}
                  onClick={(e) => clickCore(c.id, e.shiftKey)}
                  className="block w-full text-left"
                >
                  <Preview seed={c.seed} selected={sel} className={sel ? "ring-1 ring-accent" : ""} />
                  <span className={`mt-1 block truncate text-xs ${sel ? "text-accent" : "text-muted"}`}>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted" data-testid="core-count">
          {coreIds.length === 0
            ? "nessun core selezionato · shift+click per sceglierne più di uno"
            : `${coreIds.length} selezionat${coreIds.length === 1 ? "o" : "i"} · shift+click per aggiungere`}
        </p>
      </div>
    </section>
  );
}
