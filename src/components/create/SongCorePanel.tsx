"use client";

import Link from "next/link";
import { useState } from "react";
import Preview from "@/components/Preview";
import { MAX_DURATION_SECONDS } from "@/config/format";
import { fmtSeconds, fmtTime, pick } from "@/lib/format";
import type { LyricLine } from "@/lib/lyrics";
import type { SongWithSnippets } from "@/lib/songs";
import { CORES } from "@/mock/cores";

export type CreateSong = SongWithSnippets & { lines: LyricLine[] };

type Props = {
  /** null = in caricamento */
  songs: CreateSong[] | null;
  error: string;
  onRetry: () => void;
  songId: string;
  onSong: (id: string) => void;
  snippetId: string;
  onSnippet: (id: string) => void;
  coreIds: string[];
  onCores: (ids: string[]) => void;
};

export default function SongCorePanel({ songs, error, onRetry, songId, onSong, snippetId, onSnippet, coreIds, onCores }: Props) {
  const [tab, setTab] = useState<"recent" | "mine">("recent");

  const list = songs ?? [];
  const song = list.find((s) => s.id === songId);

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
        {songs === null && (
          <p className="text-xs text-muted" data-testid="songs-loading">
            carico le canzoni…
          </p>
        )}
        {error && (
          <p role="alert" data-testid="songs-error" className="flex flex-wrap items-center gap-2 text-xs">
            {error}
            <button type="button" className="btn px-2 py-0.5 text-xs" onClick={onRetry}>
              riprova
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <select
            data-testid="song-select"
            aria-label="canzone"
            className="field min-w-0 flex-1"
            value={songId}
            disabled={songs === null}
            onChange={(e) => onSong(e.target.value)}
          >
            <option value="">{songs !== null && list.length === 0 ? "nessuna canzone caricata" : "scegli una canzone"}</option>
            {list.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.artist || "artista sconosciuto"}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            data-testid="song-shuffle"
            disabled={list.length === 0}
            onClick={() => onSong(pick(list).id)}
          >
            shuffle
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/songs" className="btn" data-testid="upload-song">
            carica canzone
          </Link>
          {songs !== null && list.length === 0 && !error && (
            <span className="text-xs text-muted" data-testid="songs-none">
              carica un mp3, wav o m4a dalla pagina songs
            </span>
          )}
        </div>

        {song && (
          <div data-testid="segment" className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs text-muted">snippet</h3>
              <Link href={`/songs/${song.id}`} className="btn" data-testid="segment-edit">
                modifica
              </Link>
            </div>
            {song.snippets.length === 0 ? (
              <p className="text-xs text-muted" data-testid="snippets-none">
                {song.analyzed
                  ? "nessuno snippet: aprila con “modifica” e scegline uno"
                  : "nessuno snippet: sincronizza il testo e scegline uno con “modifica”"}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5" data-testid="snippet-options" aria-label="snippet della canzone">
                {song.snippets.map((sn) => {
                  const on = sn.id === snippetId;
                  const secs = sn.end_seconds - sn.start_seconds;
                  return (
                    <li key={sn.id}>
                      <button
                        type="button"
                        data-testid={`snippet-option-${sn.id}`}
                        aria-pressed={on}
                        onClick={() => onSnippet(on ? "" : sn.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left ${on ? "border-accent bg-bg" : "border-border hover:border-muted"}`}
                      >
                        <span className="flex gap-2">
                          <span className="w-6 shrink-0 text-muted">da</span>
                          <span data-testid="segment-from" className="min-w-0 break-words">
                            {song.lines[sn.from_line]?.text ?? `riga ${sn.from_line + 1}`}
                          </span>
                        </span>
                        <span className="flex gap-2">
                          <span className="w-6 shrink-0 text-muted">a</span>
                          <span data-testid="segment-to" className="min-w-0 break-words">
                            {song.lines[sn.to_line]?.text ?? `riga ${sn.to_line + 1}`}
                          </span>
                        </span>
                        <span className={`mt-1 block text-xs ${secs > MAX_DURATION_SECONDS + 1e-6 ? "text-text" : "text-muted"}`}>
                          {fmtTime(sn.start_seconds)}–{fmtTime(sn.end_seconds)} · {fmtSeconds(secs, 1)} · max {MAX_DURATION_SECONDS} s
                          {secs > MAX_DURATION_SECONDS + 1e-6 ? " (verrà tagliato)" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
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
