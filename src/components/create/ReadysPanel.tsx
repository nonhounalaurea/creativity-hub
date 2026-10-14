"use client";

import Preview from "@/components/Preview";

export type CreatedReady = { id: string; title: string; sub: string; seed: number; line: string };

type Props = {
  readys: CreatedReady[];
  canReady: boolean;
  missing: string[];
  onReady: () => void;
};

export default function ReadysPanel({ readys, canReady, missing, onReady }: Props) {
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="readys">
      <div className="card flex flex-col gap-2">
        <button
          type="button"
          data-testid="ready-button"
          disabled={!canReady}
          onClick={onReady}
          className="w-full rounded-xl bg-accent py-4 text-lg font-semibold text-bg transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:bg-bg disabled:text-muted disabled:ring-1 disabled:ring-border"
        >
          ready
        </button>
        <p data-testid="ready-hint" className="text-center text-xs text-muted">
          {canReady ? "tutto pronto" : `manca ${missing.join(" e ")}`}
        </p>
      </div>

      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">readys</h2>
        {readys.length === 0 ? (
          <p data-testid="readys-empty" className="py-6 text-center text-sm text-muted">
            le tue ultime anteprime restano in alto
          </p>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="readys-list">
            {readys.map((r) => (
              <li key={r.id} data-testid="ready-item">
                <Preview seed={r.seed}>
                  <p
                    className="absolute inset-0 flex items-center justify-center px-[6%] text-center font-medium"
                    style={{ fontSize: "6cqw", lineHeight: 1.15 }}
                  >
                    {r.line}
                  </p>
                </Preview>
                <p className="mt-1 truncate text-xs text-muted">
                  {r.title} · {r.sub}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
