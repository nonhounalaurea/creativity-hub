"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,button,textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-md shadow-xl">
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

type Named = { id: string; title: string; artist: string | null };

export function RenameDialog({
  song,
  onSave,
  onClose,
}: {
  song: Named;
  onSave: (title: string, artist: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("il titolo non può essere vuoto");
    setBusy(true);
    setError("");
    try {
      await onSave(title, artist);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "non riesco a salvare");
      setBusy(false);
    }
  }

  return (
    <Modal title="rinomina canzone" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          titolo
          <input data-testid="rename-title" className="field text-text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          artista
          <input data-testid="rename-artist" className="field text-text" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={200} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-text">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            annulla
          </button>
          <button type="submit" className="btn border-accent text-accent" data-testid="rename-save" disabled={busy}>
            {busy ? "salvo…" : "salva"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog({
  song,
  onConfirm,
  onClose,
}: {
  song: Named;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "non riesco a eliminare");
      setBusy(false);
    }
  }
  return (
    <Modal title="eliminare la canzone?" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        “{song.title}” verrà eliminata insieme al file audio, al testo sincronizzato e a tutti i suoi snippet. Non si può annullare.
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-text">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          annulla
        </button>
        <button type="button" className="btn border-accent text-accent" data-testid="delete-confirm" onClick={go} disabled={busy}>
          {busy ? "elimino…" : "elimina"}
        </button>
      </div>
    </Modal>
  );
}
