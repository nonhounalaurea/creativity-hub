"use client";

import { useState } from "react";
import { MAX_DURATION_SECONDS } from "@/config/format";
import { CORES } from "@/mock/cores";
import { DROPDOWN_SONGS, LINE_SECONDS } from "@/mock/songs";
import SongCorePanel from "./SongCorePanel";
import LookPanel from "./LookPanel";
import ReadysPanel, { type CreatedReady } from "./ReadysPanel";

export default function CreateView() {
  const [songId, setSongId] = useState("");
  const [range, setRange] = useState<[number, number]>([0, 5]);
  const [coreIds, setCoreIds] = useState<string[]>([]);
  const [readys, setReadys] = useState<CreatedReady[]>([]);

  const song = DROPDOWN_SONGS.find((s) => s.id === songId);
  const missing: string[] = [];
  if (!song) missing.push("una canzone");
  if (coreIds.length === 0) missing.push("almeno un core");
  const canReady = missing.length === 0;

  function onSong(id: string) {
    setSongId(id);
    const s = DROPDOWN_SONGS.find((x) => x.id === id);
    if (s) setRange([0, Math.min(5, s.lyrics.length - 1)]);
  }

  function makeReady() {
    if (!song || !canReady) return;
    const cores = CORES.filter((c) => coreIds.includes(c.id));
    const seconds = Math.min(MAX_DURATION_SECONDS, (range[1] - range[0] + 1) * LINE_SECONDS);
    setReadys((prev) => [
      {
        id: `new-${Date.now()}-${prev.length}`,
        title: song.title,
        sub: `${cores.map((c) => c.name).join(" + ")} · ${seconds} s`,
        seed: cores[0].seed,
        line: song.lyrics[range[0]].text,
      },
      ...prev,
    ]);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SongCorePanel
        songId={songId}
        onSong={onSong}
        range={range}
        onRange={setRange}
        coreIds={coreIds}
        onCores={setCoreIds}
      />
      <LookPanel />
      <ReadysPanel readys={readys} canReady={canReady} missing={missing} onReady={makeReady} />
    </div>
  );
}
