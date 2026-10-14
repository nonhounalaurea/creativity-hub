"use client";

import Preview from "@/components/Preview";
import { Empty, PageHeader, Toolbar, useListControls, type SortDef } from "@/components/list";
import { fmtDate } from "@/lib/format";
import { READYS, type Ready } from "@/mock/readys";

const SORTS: SortDef<Ready>[] = [
  { id: "recent", label: "più recenti", cmp: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  { id: "old", label: "più vecchi", cmp: (a, b) => a.addedAt.localeCompare(b.addedAt) },
  { id: "name", label: "nome a-z", cmp: (a, b) => a.title.localeCompare(b.title, "it") },
  { id: "dur", label: "durata", cmp: (a, b) => b.duration - a.duration },
];

export default function ReadysPage() {
  const ctl = useListControls(READYS, (r) => `${r.title} ${r.song} ${r.core}`, SORTS);
  return (
    <>
      <PageHeader title="readys" hint="i video che hai già preparato" />
      <Toolbar ctl={ctl} sorts={SORTS} placeholder="cerca per titolo, canzone o core" />
      {ctl.result.length === 0 ? (
        <Empty query={ctl.query} onReset={() => ctl.setQuery("")} />
      ) : (
        <ul
          data-testid="items"
          className={ctl.view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}
        >
          {ctl.result.map((r) => (
            <li key={r.id} data-testid="item" className={ctl.view === "grid" ? "" : "card flex items-center gap-4 p-3"}>
              <div className={ctl.view === "grid" ? "" : "w-40 shrink-0 sm:w-64"}>
                <Preview seed={r.seed}>
                  <p className="absolute inset-0 flex items-center justify-center px-[6%] text-center font-medium" style={{ fontSize: "6cqw", lineHeight: 1.15 }}>
                    {r.line}
                  </p>
                </Preview>
              </div>
              <div className={`min-w-0 ${ctl.view === "grid" ? "mt-2" : ""}`}>
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted">
                  {r.core} · {r.duration} s · {fmtDate(r.addedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
