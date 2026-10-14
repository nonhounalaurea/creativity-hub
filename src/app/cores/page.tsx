"use client";

import Preview from "@/components/Preview";
import { Empty, PageHeader, Toolbar, useListControls, type SortDef } from "@/components/list";
import { fmtDate } from "@/lib/format";
import { CORES, type Core } from "@/mock/cores";

const SORTS: SortDef<Core>[] = [
  { id: "recent", label: "più recenti", cmp: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  { id: "name", label: "nome a-z", cmp: (a, b) => a.name.localeCompare(b.name, "it") },
  { id: "uses", label: "più usati", cmp: (a, b) => b.uses - a.uses },
];

export default function CoresPage() {
  const ctl = useListControls(CORES, (c) => `${c.name} ${c.tag}`, SORTS);
  return (
    <>
      <PageHeader title="cores" hint="gli sfondi animati su cui scrivere il testo" />
      <Toolbar ctl={ctl} sorts={SORTS} placeholder="cerca per nome o categoria" />
      {ctl.result.length === 0 ? (
        <Empty query={ctl.query} onReset={() => ctl.setQuery("")} />
      ) : (
        <ul
          data-testid="items"
          className={ctl.view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}
        >
          {ctl.result.map((c) => (
            <li key={c.id} data-testid="item" className={ctl.view === "grid" ? "" : "card flex items-center gap-4 p-3"}>
              <div className={ctl.view === "grid" ? "" : "w-40 shrink-0 sm:w-64"}>
                <Preview seed={c.seed} />
              </div>
              <div className={`min-w-0 ${ctl.view === "grid" ? "mt-2" : ""}`}>
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  {c.tag} · usato {c.uses} volte · {fmtDate(c.addedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
