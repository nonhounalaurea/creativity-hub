"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CORES } from "@/mock/cores";
import { parseLyricsDoc } from "@/lib/lyrics";
import { listSongsWithSnippets, type SongWithSnippets } from "@/lib/songs";
import SongCorePanel, { type CreateSong } from "./SongCorePanel";
import LookPanel from "./LookPanel";
import ReadysPanel, { type CreatedReady } from "./ReadysPanel";

export default function CreateView() {
  const [songs, setSongs] = useState<CreateSong[] | null>(null);
  const [error, setError] = useState("");
  const [songId, setSongId] = useState("");
  const [snippetId, setSnippetId] = useState("");
  const [coreIds, setCoreIds] = useState<string[]>([]);
  const [readys, setReadys] = useState<CreatedReady[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const rows: SongWithSnippets[] = await listSongsWithSnippets();
      setSongs(rows.map((r) => ({ ...r, lines: parseLyricsDoc(r.lyrics) ?? [] })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "non riesco a leggere le canzoni");
      setSongs((s) => s ?? []);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const song = useMemo(() => songs?.find((s) => s.id === songId), [songs, songId]);
  const snippet = song?.snippets.find((x) => x.id === snippetId);

  const missing: string[] = [];
  if (!song) missing.push("una canzone");
  else if (!snippet) missing.push("uno snippet");
  if (coreIds.length === 0) missing.push("almeno un core");
  const canReady = missing.length === 0;

  function onSong(id: string) {
    setSongId(id);
    const s = songs?.find((x) => x.id === id);
    // con un solo snippet la scelta è ovvia
    setSnippetId(s && s.snippets.length === 1 ? s.snippets[0].id : "");
  }

  function makeReady() {
    if (!song || !snippet || !canReady) return;
    const cores = CORES.filter((c) => coreIds.includes(c.id));
    const seconds = Math.round((snippet.end_seconds - snippet.start_seconds) * 10) / 10;
    setReadys((prev) => [
      {
        id: `new-${Date.now()}-${prev.length}`,
        title: song.title,
        sub: `${cores.map((c) => c.name).join(" + ")} · ${String(seconds).replace(".", ",")} s`,
        seed: cores[0].seed,
        line: song.lines[snippet.from_line]?.text ?? song.title,
      },
      ...prev,
    ]);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SongCorePanel
        songs={songs}
        error={error}
        onRetry={load}
        songId={songId}
        onSong={onSong}
        snippetId={snippetId}
        onSnippet={setSnippetId}
        coreIds={coreIds}
        onCores={setCoreIds}
      />
      <LookPanel />
      <ReadysPanel readys={readys} canReady={canReady} missing={missing} onReady={makeReady} />
    </div>
  );
}
