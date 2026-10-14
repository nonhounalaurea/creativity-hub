"use client";

import { Empty, PageHeader, Toolbar, useListControls, type SortDef } from "@/components/list";
import { gradientFor } from "@/lib/gradient";
import { fmtDate, fmtTime } from "@/lib/format";
import { SONGS, type Song } from "@/mock/songs";

const SORTS: SortDef<Song>[] = [
  { id: "recent", label: "più recenti", cmp: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  { id: "title", label: "titolo a-z", cmp: (a, b) => a.title.localeCompare(b.title, "it") },
  { id: "artist", label: "artista a-z", cmp: (a, b) => a.artist.localeCompare(b.artist, "it") },
  { id: "dur", label: "durata", cmp: (a, b) => b.duration - a.duration },
  { id: "bpm", label: "bpm", cmp: (a, b) => b.bpm - a.bpm },
];

export default function SongsPage() {
  const ctl = useListControls(SONGS, (s) => `${s.title} ${s.artist}`, SORTS);
  return (
    <>
      <PageHeader title="songs" hint="le canzoni su cui puoi lavorare" />
      <Toolbar ctl={ctl} sorts={SORTS} placeholder="cerca per titolo o artista" showView={false} />
      {ctl.result.length === 0 ? (
        <Empty query={ctl.query} onReset={() => ctl.setQuery("")} />
      ) : (
        <ul data-testid="items" className="flex flex-col gap-3">
          {ctl.result.map((s) => (
            <li key={s.id} data-testid="item" className="card flex items-center gap-4 p-3">
              <div
                className="size-14 shrink-0 rounded-lg border border-border"
                style={{ background: gradientFor(s.seed) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="truncate text-xs text-muted">{s.artist}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted">
                <p>
                  {fmtTime(s.duration)} · {s.bpm} bpm
                </p>
                <p>{fmtDate(s.addedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
