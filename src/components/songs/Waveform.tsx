"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fmtTime } from "@/lib/format";
import { fracToTime, peaksToColumns, timeToFrac } from "@/lib/waveform";

export type Marker = { index: number; time: number; selected?: boolean; active?: boolean };
export type Region = { start: number; end: number };

type Props = {
  peaks: Float32Array | null;
  duration: number;
  time: number;
  playing: boolean;
  markers?: Marker[];
  region?: Region | null;
  onSeek: (t: number) => void;
  onMarkerMove?: (index: number, t: number) => void;
  onMarkerSelect?: (index: number) => void;
};

const HEIGHT = 112;
const ZOOMS = [1, 2, 4, 8, 16, 32];
const TICKS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

/**
 * Forma d'onda su canvas con zoom orizzontale (scorrimento nativo, anche col dito),
 * playhead, regione evidenziata e marcatori trascinabili (mouse e touch).
 */
export default function Waveform({ peaks, duration, time, playing, markers = [], region, onSeek, onMarkerMove, onMarkerSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [cw, setCw] = useState(0);
  const [zoom, setZoom] = useState(1);
  const pendingCenter = useRef<number | null>(null);
  const dragging = useRef<{ index: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const maxZoom = cw > 0 ? Math.max(1, Math.min(32, Math.floor(16000 / (cw * dpr)))) : 1;
  const zooms = ZOOMS.filter((z) => z <= maxZoom);
  const z = Math.min(zoom, maxZoom);
  const innerW = Math.max(cw * z, 1);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setCw(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const changeZoom = useCallback(
    (dir: 1 | -1) => {
      const el = scroller.current;
      if (!el || duration <= 0) return;
      const idx = Math.max(0, zooms.indexOf(z));
      const next = zooms[Math.min(zooms.length - 1, Math.max(0, idx + dir))];
      if (next === z) return;
      pendingCenter.current = fracToTime((el.scrollLeft + el.clientWidth / 2) / innerW, duration);
      setZoom(next);
    },
    [duration, innerW, z, zooms],
  );

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || pendingCenter.current == null || duration <= 0) return;
    el.scrollLeft = timeToFrac(pendingCenter.current, duration) * innerW - el.clientWidth / 2;
    pendingCenter.current = null;
  }, [z, innerW, duration]);

  // tasti + e - per lo zoom (non mentre si scrive in un campo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") changeZoom(1);
      else if (e.key === "-" || e.key === "_") changeZoom(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeZoom]);

  // disegno (non dipende dal tempo di riproduzione)
  const cols = useMemo(() => (peaks && cw > 0 ? peaksToColumns(peaks, Math.round(innerW * dpr)) : null), [peaks, cw, innerW, dpr]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || cw === 0) return;
    const W = Math.round(innerW * dpr);
    const H = Math.round(HEIGHT * dpr);
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(c);
    const accent = css.getPropertyValue("--accent").trim() || "#7ae0b0";
    const muted = css.getPropertyValue("--muted").trim() || "#8b92a0";
    const border = css.getPropertyValue("--border").trim() || "#262a33";
    const rulerH = 14 * dpr;
    const mid = (H - rulerH) / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = border;
    ctx.fillRect(0, Math.round(mid), W, Math.max(1, Math.round(dpr)));

    const rx0 = region && duration > 0 ? timeToFrac(region.start, duration) * W : -1;
    const rx1 = region && duration > 0 ? timeToFrac(region.end, duration) * W : -1;
    if (region && rx1 > rx0) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = accent;
      ctx.fillRect(rx0, 0, rx1 - rx0, H - rulerH);
      ctx.globalAlpha = 1;
    }
    if (cols) {
      const amp = mid - 2 * dpr;
      for (let x = 0; x < cols.length; x++) {
        const h = Math.max(dpr * 0.5, cols[x] * amp);
        ctx.fillStyle = x >= rx0 && x <= rx1 ? accent : muted;
        ctx.fillRect(x, mid - h, 1, h * 2);
      }
    }
    // righello
    if (duration > 0) {
      const pxPerSec = W / duration;
      const step = TICKS.find((s) => s * pxPerSec >= 70 * dpr) ?? TICKS[TICKS.length - 1];
      ctx.fillStyle = muted;
      ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "bottom";
      for (let t = 0; t <= duration; t += step) {
        const x = t * pxPerSec;
        ctx.fillRect(x, H - rulerH, 1, 4 * dpr);
        ctx.fillText(fmtTime(t), x + 3 * dpr, H - 1 * dpr);
      }
    }
  }, [cols, cw, innerW, dpr, region, duration]);

  // il playhead segue la riproduzione quando è zoomato
  useEffect(() => {
    const el = scroller.current;
    if (!el || !playing || z <= 1 || duration <= 0) return;
    const x = timeToFrac(time, duration) * innerW;
    if (x < el.scrollLeft + 24 || x > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = x - el.clientWidth * 0.25;
  }, [time, playing, z, innerW, duration]);

  const timeAt = (clientX: number) => {
    const r = inner.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    return fracToTime((clientX - r.left) / r.width, duration);
  };

  const visible = markers.filter((m) => duration > 0 && m.time >= 0 && m.time <= duration);

  return (
    <div className="min-w-0" data-testid="waveform">
      <div
        ref={scroller}
        className="relative overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-bg"
        style={{ height: HEIGHT + 12 }}
        role="group"
        aria-label={`forma d'onda, zoom ${z}×`}
      >
        <div
          ref={inner}
          className="relative"
          style={{ width: innerW, height: HEIGHT }}
          onClick={(e) => {
            if (justDragged.current) return;
            onSeek(timeAt(e.clientX));
          }}
        >
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" style={{ width: "100%", height: HEIGHT }} />
          {visible.map((m) => (
            <div
              key={m.index}
              data-testid={`marker-${m.index}`}
              title={`riga ${m.index + 1} · trascina per spostare`}
              className="absolute top-0 -ml-3.5 w-7 cursor-ew-resize touch-none"
              style={{ left: `${timeToFrac(m.time, duration) * 100}%`, height: HEIGHT - 14 }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                if (!onMarkerMove) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = { index: m.index, moved: false };
                onMarkerSelect?.(m.index);
              }}
              onPointerMove={(e) => {
                const d = dragging.current;
                if (!d || d.index !== m.index) return;
                d.moved = true;
                onMarkerMove?.(m.index, timeAt(e.clientX));
              }}
              onPointerUp={(e) => {
                const d = dragging.current;
                dragging.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                if (d?.moved) {
                  justDragged.current = true;
                  window.setTimeout(() => (justDragged.current = false), 0);
                }
              }}
              onPointerCancel={() => (dragging.current = null)}
            >
              <span
                className={`absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 ${m.selected ? "bg-accent" : m.active ? "bg-text" : "bg-muted/70"}`}
                aria-hidden
              />
              {(m.selected || m.active) && (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded bg-accent px-1 text-[10px] font-medium leading-4 text-bg" aria-hidden>
                  {m.index + 1}
                </span>
              )}
            </div>
          ))}
          {duration > 0 && (
            <div
              data-testid="playhead"
              className="pointer-events-none absolute top-0 w-px bg-text"
              style={{ left: `${timeToFrac(time, duration) * 100}%`, height: HEIGHT - 14 }}
              aria-hidden
            />
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
        <span>{peaks ? "trascina i marcatori per correggere i tempi" : "forma d'onda non disponibile: puoi comunque sincronizzare"}</span>
        <span className="flex items-center gap-1">
          <button type="button" className="btn px-2 py-0.5" aria-label="riduci zoom" data-testid="zoom-out" onClick={() => changeZoom(-1)} disabled={z <= 1}>
            −
          </button>
          <span data-testid="zoom-level" className="w-8 text-center">
            {z}×
          </span>
          <button type="button" className="btn px-2 py-0.5" aria-label="aumenta zoom" data-testid="zoom-in" onClick={() => changeZoom(1)} disabled={z >= maxZoom}>
            +
          </button>
        </span>
      </div>
    </div>
  );
}
