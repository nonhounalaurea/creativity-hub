"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toolbar, useListControls, type SortDef } from "@/components/list";
import { ACCEPT_ATTR, MAX_UPLOAD_MB } from "@/config/songs";
import { fmtDate, fmtTime } from "@/lib/format";
import { deleteSong, listSongs, renameSong, thumbPeaks, uploadSong, type SongRow, type UploadStage } from "@/lib/songs";
import MiniWave from "./MiniWave";
import { DeleteDialog, RenameDialog } from "./dialogs";

type Filter = "all" | "ready" | "todo";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "tutte" },
  { id: "ready", label: "analizzate" },
  { id: "todo", label: "non analizzate" },
];

const snippetCount = (s: SongRow) => s.snippets?.[0]?.count ?? 0;

const SORTS: SortDef<SongRow>[] = [
  { id: "recent", label: "più recenti", cmp: (a, b) => b.created_at.localeCompare(a.created_at) },
  { id: "title", label: "titolo a-z", cmp: (a, b) => a.title.localeCompare(b.title, "it") },
  { id: "artist", label: "artista a-z", cmp: (a, b) => (a.artist ?? "").localeCompare(b.artist ?? "", "it") },
  { id: "dur", label: "durata", cmp: (a, b) => (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0) },
  { id: "snippets", label: "più snippet", cmp: (a, b) => snippetCount(b) - snippetCount(a) },
];

type Job = { id: number; name: string; fraction: number; stage: UploadStage | "done" | "error"; error?: string };
const STAGE_LABEL: Record<string, string> = {
  check: "controllo il file…",
  upload: "caricamento…",
  analyze: "calcolo la forma d'onda…",
  save: "salvo…",
  done: "caricata",
};

export default function SongsView() {
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [renaming, setRenaming] = useState<SongRow | null>(null);
  const [deleting, setDeleting] = useState<SongRow | null>(null);
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const jobId = useRef(0);

  const load = useCallback(async () => {
    setError("");
    try {
      setSongs(await listSongs());
    } catch (e) {
      setError(e instanceof Error ? e.message : "non riesco a leggere le canzoni");
      setSongs((s) => s ?? []);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (songs ?? []).filter((s) => filter === "all" || (filter === "ready" ? s.analyzed : !s.analyzed)),
    [songs, filter],
  );
  const ctl = useListControls(filtered, (s) => `${s.title} ${s.artist ?? ""}`, SORTS);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (input.current) input.current.value = "";
    for (const file of list) {
      const id = ++jobId.current;
      setJobs((j) => [...j, { id, name: file.name, fraction: 0, stage: "check" }]);
      const patch = (p: Partial<Job>) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, ...p } : x)));
      try {
        const row = await uploadSong(file, (fraction, stage) => patch({ fraction, stage }));
        patch({ fraction: 1, stage: "done" });
        setSongs((s) => [{ ...row, snippets: [{ count: 0 }] }, ...(s ?? [])]);
      } catch (e) {
        patch({ stage: "error", error: e instanceof Error ? e.message : "caricamento non riuscito" });
      }
    }
  }

  const empty = songs !== null && songs.length === 0 && !error;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">songs</h1>
          <p className="mt-1 text-sm text-muted">le canzoni su cui puoi lavorare</p>
        </header>
        <div className="flex flex-col items-end gap-1">
          <button type="button" className="btn border-accent text-accent" data-testid="upload-song" onClick={() => input.current?.click()}>
            carica canzone
          </button>
          <span className="text-xs text-muted" data-testid="upload-limit">
            mp3, wav, m4a · max {MAX_UPLOAD_MB} MB per file
          </span>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            data-testid="upload-input"
            className="sr-only"
            tabIndex={-1}
            aria-label="scegli i file audio da caricare"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      {jobs.length > 0 && (
        <ul className="mb-5 flex flex-col gap-2" data-testid="upload-jobs" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.id} data-testid="upload-job" className="card flex flex-col gap-1.5 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{j.name}</span>
                {(j.stage === "done" || j.stage === "error") && (
                  <button type="button" className="shrink-0 text-xs text-muted hover:text-text" onClick={() => setJobs((x) => x.filter((y) => y.id !== j.id))}>
                    chiudi
                  </button>
                )}
              </div>
              {j.stage === "error" ? (
                <p role="alert" data-testid="upload-error" className="text-xs text-text">
                  {j.error}
                </p>
              ) : (
                <>
                  <div
                    role="progressbar"
                    aria-label={`caricamento di ${j.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(j.fraction * 100)}
                    data-testid="upload-progress"
                    className="h-1.5 overflow-hidden rounded-full bg-bg"
                  >
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(j.fraction * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted">
                    {STAGE_LABEL[j.stage]} {j.stage === "upload" ? `${Math.round(j.fraction * 100)}%` : ""}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <p role="status" className="mb-4 text-sm text-muted">
          {notice}
        </p>
      )}

      {songs === null && (
        <p data-testid="songs-loading" className="py-10 text-center text-sm text-muted">
          carico le canzoni…
        </p>
      )}

      {error && (
        <div role="alert" data-testid="songs-error" className="card mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>{error}</span>
          <button type="button" className="btn" onClick={load}>
            riprova
          </button>
        </div>
      )}

      {empty && (
        <div data-testid="songs-empty" className="card flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm">ancora nessuna canzone</p>
          <p className="max-w-xs text-xs text-muted">
            carica un mp3, wav o m4a (max {MAX_UPLOAD_MB} MB): poi incolla il testo e sincronizzalo a tempo di musica.
          </p>
          <button type="button" className="btn border-accent text-accent" onClick={() => input.current?.click()}>
            carica la prima canzone
          </button>
        </div>
      )}

      {songs !== null && songs.length > 0 && (
        <>
          <Toolbar ctl={ctl} sorts={SORTS} placeholder="cerca per titolo o artista" />
          <div className="mb-5 -mt-2 flex flex-wrap gap-1 text-sm" role="group" aria-label="filtro">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                data-testid={`filter-${f.id}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg border px-3 py-1 ${filter === f.id ? "border-border bg-surface text-accent" : "border-transparent text-muted hover:text-text"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {ctl.result.length === 0 ? (
            <div data-testid="empty" className="card flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted">
                {ctl.query ? `nessun risultato per “${ctl.query}”` : "nessuna canzone in questo filtro"}
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  ctl.setQuery("");
                  setFilter("all");
                }}
              >
                azzera filtri
              </button>
            </div>
          ) : (
            <ul
              data-testid="items"
              className={ctl.view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}
            >
              {ctl.result.map((s) => (
                <SongCard key={s.id} song={s} list={ctl.view === "list"} onRename={() => setRenaming(s)} onDelete={() => setDeleting(s)} />
              ))}
            </ul>
          )}
        </>
      )}

      {renaming && (
        <RenameDialog
          song={renaming}
          onClose={() => setRenaming(null)}
          onSave={async (title, artist) => {
            await renameSong(renaming.id, title, artist);
            setSongs((l) => (l ?? []).map((x) => (x.id === renaming.id ? { ...x, title: title.trim(), artist: artist.trim() || null } : x)));
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          song={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const { fileRemoved } = await deleteSong(deleting);
            setSongs((l) => (l ?? []).filter((x) => x.id !== deleting.id));
            setNotice(fileRemoved ? "" : "canzone eliminata, ma il file nello storage non è stato rimosso: riprova più tardi");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function SongCard({ song, list, onRename, onDelete }: { song: SongRow; list: boolean; onRename: () => void; onDelete: () => void }) {
  const peaks = useMemo(() => thumbPeaks(song), [song]);
  const n = snippetCount(song);
  return (
    <li data-testid="item" data-song-id={song.id} className={`card flex min-w-0 gap-3 p-3 ${list ? "flex-col sm:flex-row sm:items-center" : "flex-col"}`}>
      <div className={list ? "w-full sm:w-40 sm:shrink-0" : "w-full"}>
        <MiniWave peaks={peaks} />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/songs/${song.id}`} data-testid="song-open" className="block truncate text-sm font-medium hover:text-accent">
          {song.title}
        </Link>
        <p className="truncate text-xs text-muted">{song.artist || "artista sconosciuto"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{song.duration_seconds ? fmtTime(song.duration_seconds) : "–:––"}</span>
          <span>·</span>
          <span data-testid="snippet-count">
            {n} snippet
          </span>
          <span>·</span>
          <span>{fmtDate(song.created_at)}</span>
          {song.analyzed ? (
            <span data-testid="badge-ready" className="rounded-full border border-accent px-2 py-0.5 text-accent">
              testo pronto
            </span>
          ) : (
            <span data-testid="badge-todo" className="rounded-full border border-border px-2 py-0.5">
              da sincronizzare
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn" data-testid="song-rename" onClick={onRename}>
          rinomina
        </button>
        <button type="button" className="btn" data-testid="song-delete" onClick={onDelete}>
          elimina
        </button>
      </div>
    </li>
  );
}
