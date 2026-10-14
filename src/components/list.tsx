"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SortDef<T> = { id: string; label: string; cmp: (a: T, b: T) => number };

export function useListControls<T>(items: T[], searchText: (i: T) => string, sorts: SortDef<T>[]) {
  const [query, setQuery] = useState("");
  const [sortId, setSortId] = useState(sorts[0].id);
  const [view, setView] = useState<"grid" | "list">("grid");
  const result = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cmp = (sorts.find((s) => s.id === sortId) ?? sorts[0]).cmp;
    return items.filter((i) => !q || searchText(i).toLowerCase().includes(q)).sort(cmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, sortId]);
  return { query, setQuery, sortId, setSortId, view, setView, result };
}

type ControlsProps<T> = {
  ctl: ReturnType<typeof useListControls<T>>;
  sorts: SortDef<T>[];
  placeholder: string;
  showView?: boolean;
};

export function Toolbar<T>({ ctl, sorts, placeholder, showView = true }: ControlsProps<T>) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <input
        type="search"
        data-testid="search"
        aria-label="cerca"
        value={ctl.query}
        onChange={(e) => ctl.setQuery(e.target.value)}
        placeholder={placeholder}
        className="field min-w-0 flex-1 basis-48"
      />
      <select
        data-testid="sort"
        aria-label="ordina"
        value={ctl.sortId}
        onChange={(e) => ctl.setSortId(e.target.value)}
        className="field"
      >
        {sorts.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {showView && (
        <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label="vista">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              data-testid={`view-${v}`}
              aria-pressed={ctl.view === v}
              onClick={() => ctl.setView(v)}
              className={`px-3 py-1.5 text-sm ${ctl.view === v ? "bg-surface text-accent" : "text-muted"}`}
            >
              {v === "grid" ? "griglia" : "lista"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Empty({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div data-testid="empty" className="card flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-muted">nessun risultato per “{query}”</p>
      <button type="button" className="btn" onClick={onReset}>
        azzera ricerca
      </button>
    </div>
  );
}

export function PageHeader({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      {children}
    </header>
  );
}
