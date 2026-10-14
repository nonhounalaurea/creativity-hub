"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NUDGE_SECONDS, REWIND_SECONDS } from "@/config/songs";
import { decodePeaks } from "@/lib/audio";
import { fmtSeconds, fmtTime } from "@/lib/format";
import { finalizeLyrics, isFullySynced, lineAtTime, lyricsToText, parseLyricsDoc, snippetRange, type LyricsDoc } from "@/lib/lyrics";
import { linesFromText } from "@/lib/lyrics";
import type { SnippetRow, SongRow } from "@/lib/songs";
import LyricsTab from "./LyricsTab";
import SnippetsTab, { type Sel } from "./SnippetsTab";
import SyncTab, { TapBar } from "./SyncTab";
import Waveform, { type Marker } from "./Waveform";
import { DeleteDialog, RenameDialog } from "./dialogs";
import { useLyricsEditor } from "./useLyricsEditor";
import { usePlayer } from "./usePlayer";

/** Operazioni sui dati: nella pagina reale parlano con Supabase. */
export type EditorApi = {
  saveLyrics(doc: LyricsDoc, analyzed: boolean): Promise<void>;
  addSnippet(s: { from_line: number; to_line: number; start_seconds: number; end_seconds: number }): Promise<SnippetRow>;
  deleteSnippet(id: string): Promise<void>;
  renameSong(title: string, artist: string): Promise<void>;
  deleteSong(): Promise<{ fileRemoved: boolean }>;
  savePeaks(peaks: Float32Array): Promise<void>;
  refreshUrl(): Promise<string>;
};

type Tab = "text" | "sync" | "snippets";
const TABS: { id: Tab; label: string }[] = [
  { id: "text", label: "testo" },
  { id: "sync", label: "sync" },
  { id: "snippets", label: "snippet" },
];

type Props = {
  song: SongRow;
  snippets: SnippetRow[];
  audioUrl: string;
  api: EditorApi;
  onDeleted: () => void;
};

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export default function SongEditor({ song: initialSong, snippets: initialSnippets, audioUrl, api, onDeleted }: Props) {
  const [song, setSong] = useState(initialSong);
  const [snippets, setSnippets] = useState(initialSnippets);
  const [url, setUrl] = useState(audioUrl);
  const [tab, setTab] = useState<Tab>(() => (parseLyricsDoc(initialSong.lyrics)?.length ? "sync" : "text"));
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);

  const player = usePlayer(url);
  const duration = song.duration_seconds || player.duration || 0;
  const editor = useLyricsEditor(parseLyricsDoc(initialSong.lyrics) ?? [], duration);
  const { lines } = editor;

  // ------------------------------------------------------------ forma d'onda
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [peaksState, setPeaksState] = useState<"loading" | "ready" | "failed">("loading");
  const firstUrl = useRef(audioUrl);
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(firstUrl.current, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.arrayBuffer();
        const out = await decodePeaks(data, initialSong.duration_seconds ?? 0);
        if (cancelled) return;
        setPeaks(out.peaks);
        setPeaksState("ready");
        apiRef.current.savePeaks(out.peaks).catch(() => {});
      } catch {
        if (!cancelled) setPeaksState("failed");
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [initialSong.duration_seconds]);

  // ------------------------------------------------------------ salvataggi
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [textMsg, setTextMsg] = useState("");

  const persist = useCallback(
    async (next = lines) => {
      const doc = finalizeLyrics(next, duration);
      const analyzed = isFullySynced(next);
      await api.saveLyrics(doc, analyzed);
      setSong((s) => ({ ...s, analyzed, lyrics: doc }));
    },
    [api, duration, lines],
  );

  async function saveTimes() {
    setSaving(true);
    setSaveMsg("");
    try {
      await persist();
      editor.markSaved();
      setSaveMsg(isFullySynced(lines) ? "salvato · testo pronto" : "salvato");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "non riesco a salvare");
    } finally {
      setSaving(false);
    }
  }

  async function saveText(text: string) {
    setSaving(true);
    setTextMsg("");
    try {
      const next = linesFromText(text, lines, duration);
      await persist(next);
      editor.reset(next, false);
      setSel(null);
      setTextMsg("testo salvato");
    } catch (e) {
      setTextMsg(e instanceof Error ? e.message : "non riesco a salvare");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!editor.dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [editor.dirty]);
  useEffect(() => {
    if (editor.dirty) setSaveMsg("");
  }, [editor.dirty]);

  // ------------------------------------------------------------ tastiera
  const doTap = useCallback(() => {
    if (!player.playing) {
      player.play();
      return;
    }
    editor.tap(player.now());
  }, [editor, player]);

  const kb = useRef({ tab, doTap, editor, player, lines });
  kb.current = { tab, doTap, editor, player, lines };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { tab, doTap, editor, player, lines } = kb.current;
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key;
      if (e.code === "Space" || k === " ") {
        e.preventDefault();
        (e.target as HTMLElement | null)?.blur?.(); // evita che il pulsante a fuoco riceva anche il click
        if (tab === "sync") doTap();
        else player.toggle();
      } else if (k === "p" || k === "P") {
        e.preventDefault();
        player.toggle();
      } else if (k === "r" || k === "R") {
        e.preventDefault();
        player.rewind(REWIND_SECONDS);
      } else if (tab === "sync") {
        if (k === "z" || k === "Z" || k === "u" || k === "U") {
          e.preventDefault();
          editor.undo();
        } else if (k === "ArrowUp" || k === "ArrowDown") {
          e.preventDefault();
          editor.select(editor.selected + (k === "ArrowUp" ? -1 : 1));
        } else if ((k === "ArrowLeft" || k === "ArrowRight") && lines.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? NUDGE_SECONDS * 10 : NUDGE_SECONDS;
          editor.nudge(editor.selected, k === "ArrowLeft" ? -step : step);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ------------------------------------------------------------ derivati
  const activeLine = lineAtTime(lines, player.time);
  const markers: Marker[] = useMemo(
    () =>
      lines.flatMap((l, i) =>
        l.start == null ? [] : [{ index: i, time: l.start, selected: editor.selected === i && tab === "sync", active: activeLine === i }],
      ),
    [lines, editor.selected, activeLine, tab],
  );
  const region = useMemo(() => {
    if (tab !== "snippets" || !sel) return null;
    return snippetRange(lines, sel.from, sel.to);
  }, [tab, sel, lines]);

  async function refreshUrl() {
    try {
      setUrl(await api.refreshUrl());
      player.setError("");
    } catch (e) {
      player.setError(e instanceof Error ? e.message : "non riesco a rinnovare il link del file");
    }
  }

  const seekAndKeep = player.seek;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4" data-testid="song-editor">
      <audio {...player.audioProps} className="hidden" data-testid="audio" />

      <div>
        <Link href="/songs" className="text-xs text-muted hover:text-text" data-testid="back">
          ← songs
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <header className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight" data-testid="song-title">
              {song.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span data-testid="song-artist">{song.artist || "artista sconosciuto"}</span>
              <span>· {duration ? fmtTime(duration) : "–:––"}</span>
              {song.analyzed && (
                <span data-testid="badge-ready" className="rounded-full border border-accent px-2 py-0.5 text-xs text-accent">
                  testo pronto
                </span>
              )}
            </p>
          </header>
          <div className="flex gap-2">
            <button type="button" className="btn" data-testid="song-rename" onClick={() => setRenaming(true)}>
              rinomina
            </button>
            <button type="button" className="btn" data-testid="song-delete" onClick={() => setDeleting(true)}>
              elimina
            </button>
          </div>
        </div>
      </div>

      <section className="card sticky top-0 z-20 p-3" aria-label="player">
        <Waveform
          peaks={peaks}
          duration={duration}
          time={player.time}
          playing={player.playing}
          markers={markers}
          region={region}
          onSeek={seekAndKeep}
          onMarkerSelect={editor.select}
          onMarkerMove={tab === "sync" ? editor.setStart : undefined}
        />
        {peaksState === "loading" && (
          <p className="mt-1 text-xs text-muted" data-testid="peaks-loading">
            calcolo la forma d&apos;onda…
          </p>
        )}
        {peaksState === "failed" && (
          <p className="mt-1 text-xs text-muted" role="status" data-testid="peaks-failed">
            non riesco a disegnare la forma d&apos;onda di questo file (il browser non lo decodifica o è troppo grande). la riproduzione e la
            sincronizzazione funzionano lo stesso.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="btn min-w-20" data-testid="play" onClick={player.toggle} aria-pressed={player.playing}>
            {player.playing ? "pausa" : "play"}
          </button>
          <button type="button" className="btn" data-testid="rewind" onClick={() => player.rewind(REWIND_SECONDS)}>
            ↺ {REWIND_SECONDS} s
          </button>
          <span className="ml-auto text-xs tabular-nums text-muted" data-testid="player-time" aria-live="off">
            {fmtSeconds(player.time)} / {duration ? fmtTime(duration) : "–:––"}
          </span>
        </div>
        {player.error && (
          <p role="alert" data-testid="player-error" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text">
            {player.error}
            <button type="button" className="btn px-2 py-0.5 text-xs" onClick={refreshUrl}>
              riprova
            </button>
          </p>
        )}
        {tab === "sync" && (
          <TapBar lines={lines} cursor={editor.cursor} playing={player.playing} canUndo={editor.canUndo} onTap={doTap} onUndo={editor.undo} />
        )}
      </section>

      <div role="tablist" aria-label="sezioni" className="flex gap-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 ${tab === t.id ? "border-border bg-surface text-accent" : "border-transparent text-muted hover:text-text"}`}
          >
            {t.label}
            {t.id === "snippets" && snippets.length > 0 ? ` (${snippets.length})` : ""}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-w-0">
        {tab === "text" && (
          <LyricsTab
            lines={lines}
            initialText={lyricsToText(lines)}
            snippetCount={snippets.length}
            saving={saving}
            msg={textMsg}
            onSave={saveText}
          />
        )}
        {tab === "sync" && (
          <SyncTab
            lines={lines}
            cursor={editor.cursor}
            selected={editor.selected}
            activeLine={activeLine}
            dirty={editor.dirty}
            saving={saving}
            saveMsg={saveMsg}
            onSelect={editor.select}
            onCursor={editor.setCursor}
            onSetStart={editor.setStart}
            onSetEnd={editor.setEnd}
            onNudge={editor.nudge}
            onClear={editor.clear}
            onClearAll={editor.clearAll}
            onPlayFrom={(t) => {
              player.seek(t);
              player.play();
            }}
            onSave={saveTimes}
          />
        )}
        {tab === "snippets" && (
          <SnippetsTab
            lines={lines}
            time={player.time}
            sel={sel}
            setSel={setSel}
            snippets={snippets}
            dirty={editor.dirty}
            rangePlaying={player.rangePlaying}
            onPlayRange={player.playRange}
            onStop={player.pause}
            onAdd={async (s) => {
              if (editor.dirty) await persist();
              if (editor.dirty) editor.markSaved();
              const row = await api.addSnippet(s);
              setSnippets((l) => [...l, row].sort((a, b) => a.start_seconds - b.start_seconds));
            }}
            onDelete={async (id) => {
              await api.deleteSnippet(id);
              setSnippets((l) => l.filter((x) => x.id !== id));
            }}
          />
        )}
      </div>

      {renaming && (
        <RenameDialog
          song={song}
          onClose={() => setRenaming(false)}
          onSave={async (title, artist) => {
            await api.renameSong(title, artist);
            setSong((s) => ({ ...s, title: title.trim(), artist: artist.trim() || null }));
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          song={song}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await api.deleteSong();
            onDeleted();
          }}
        />
      )}
    </div>
  );
}
