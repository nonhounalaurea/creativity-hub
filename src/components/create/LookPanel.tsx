"use client";

import { useState } from "react";
import Preview from "@/components/Preview";
import { LOOK_SECTIONS } from "@/mock/looks";

const EMPTY: Record<string, string> = Object.fromEntries(LOOK_SECTIONS.map((s) => [s.id, "none"]));

export default function LookPanel() {
  const [sel, setSel] = useState<Record<string, string>>(EMPTY);
  const [note, setNote] = useState("");

  return (
    <section className="card flex min-w-0 flex-col gap-4" aria-label="look">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">look</h2>
        <div className="flex gap-2">
          <button type="button" className="btn" data-testid="look-save" onClick={() => setNote("look salvato")}>
            salva look
          </button>
          <button
            type="button"
            className="btn"
            data-testid="look-reset"
            onClick={() => {
              setSel(EMPTY);
              setNote("");
            }}
          >
            reset
          </button>
        </div>
      </div>
      {note && <p className="-mt-2 text-xs text-accent">{note}</p>}

      {LOOK_SECTIONS.map((section) => (
        <div key={section.id} data-testid={`look-section-${section.id}`} className="min-w-0">
          <h3 className="mb-2 text-xs text-muted">{section.label}</h3>
          <div className="scroll-row flex gap-2 overflow-x-auto pb-2">
            {section.items.map((item) => {
              const on = sel[section.id] === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`look-${section.id}-${item.id}`}
                  aria-pressed={on}
                  onClick={() => setSel((s) => ({ ...s, [section.id]: item.id }))}
                  className="w-28 shrink-0 text-left"
                >
                  <Preview seed={item.id === "none" ? undefined : item.seed} selected={on} />
                  <span className={`mt-1 block truncate text-xs ${on ? "text-accent" : "text-muted"}`}>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
