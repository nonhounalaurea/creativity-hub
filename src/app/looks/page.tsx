"use client";

import Preview from "@/components/Preview";
import { Empty, PageHeader, Toolbar, useListControls, type SortDef } from "@/components/list";
import { fmtDate } from "@/lib/format";
import { SAVED_LOOKS, type SavedLook } from "@/mock/looks";

const SORTS: SortDef<SavedLook>[] = [
  { id: "recent", label: "più recenti", cmp: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  { id: "name", label: "nome a-z", cmp: (a, b) => a.name.localeCompare(b.name, "it") },
  { id: "uses", label: "più usati", cmp: (a, b) => b.uses - a.uses },
];

export default function LooksPage() {
  const ctl = useListControls(
    SAVED_LOOKS,
    (l) => `${l.name} ${l.preset} ${l.text} ${l.effect} ${l.overlay} ${l.transition}`,
    SORTS,
  );
  return (
    <>
      <PageHeader title="looks" hint="le combinazioni di stile che hai salvato" />
      <Toolbar ctl={ctl} sorts={SORTS} placeholder="cerca per nome o ingrediente" />
      {ctl.result.length === 0 ? (
        <Empty query={ctl.query} onReset={() => ctl.setQuery("")} />
      ) : (
        <ul
          data-testid="items"
          className={ctl.view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}
        >
          {ctl.result.map((l) => (
            <li key={l.id} data-testid="item" className={ctl.view === "grid" ? "" : "card flex items-center gap-4 p-3"}>
              <div className={ctl.view === "grid" ? "" : "w-40 shrink-0 sm:w-64"}>
                <Preview seed={l.seed}>
                  <p className="absolute inset-0 flex items-center justify-center font-medium" style={{ fontSize: "7cqw" }}>
                    {l.name}
                  </p>
                </Preview>
              </div>
              <div className={`min-w-0 ${ctl.view === "grid" ? "mt-2" : ""}`}>
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="text-xs text-muted">
                  {l.preset} · {l.text} · {l.effect} · {l.overlay} · {l.transition}
                </p>
                <p className="text-xs text-muted">
                  usato {l.uses} volte · {fmtDate(l.addedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
