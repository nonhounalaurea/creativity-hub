"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addSnippet,
  deleteSnippet,
  deleteSong,
  getSong,
  listSnippets,
  renameSong,
  savePeaks,
  saveLyrics,
  signedUrl,
  type SnippetRow,
  type SongRow,
} from "@/lib/songs";
import SongEditor, { type EditorApi } from "./SongEditor";

type Loaded = { song: SongRow; snippets: SnippetRow[]; url: string };

/** Carica canzone, snippet e signed URL, poi apre l'editor. */
export default function SongDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    setError("");
    setData(null);
    try {
      const song = await getSong(id);
      if (!song) {
        setNotFound(true);
        return;
      }
      if (!song.file_path) {
        setError("questa canzone non ha un file audio");
        return;
      }
      const [url, snippets] = await Promise.all([signedUrl(song.file_path), listSnippets(id)]);
      setData({ song, snippets, url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "non riesco ad aprire la canzone");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load, attempt]);

  const filePath = data?.song.file_path ?? null;
  const api: EditorApi = useMemo(
    () => ({
      saveLyrics: (doc, analyzed) => saveLyrics(id, doc, analyzed),
      addSnippet: (s) => addSnippet(id, s),
      deleteSnippet,
      renameSong: (t, a) => renameSong(id, t, a),
      deleteSong: () => deleteSong({ id, file_path: filePath }),
      savePeaks: (p) => savePeaks(id, p),
      refreshUrl: () => signedUrl(filePath as string),
    }),
    [id, filePath],
  );

  if (notFound) {
    return (
      <div data-testid="song-notfound" className="card mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm">canzone non trovata</p>
        <Link href="/songs" className="btn">
          torna alle canzoni
        </Link>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" data-testid="song-error" className="card mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center text-sm">
        <p>{error}</p>
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
            riprova
          </button>
          <Link href="/songs" className="btn">
            torna alle canzoni
          </Link>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <p data-testid="song-loading" className="py-10 text-center text-sm text-muted">
        carico la canzone…
      </p>
    );
  }
  return <SongEditor song={data.song} snippets={data.snippets} audioUrl={data.url} api={api} onDeleted={() => router.push("/songs")} />;
}
