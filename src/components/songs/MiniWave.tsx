"use client";

import { useEffect, useRef } from "react";
import { peaksToColumns } from "@/lib/waveform";

/** Miniatura della forma d'onda per le card. Senza picchi: linea piatta tratteggiata. */
export default function MiniWave({ peaks }: { peaks: Float32Array | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (!w || !h) return;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const css = getComputedStyle(c);
      const accent = css.getPropertyValue("--accent").trim() || "#7ae0b0";
      const muted = css.getPropertyValue("--muted").trim() || "#8b92a0";
      ctx.clearRect(0, 0, c.width, c.height);
      const mid = c.height / 2;
      if (!peaks) {
        ctx.strokeStyle = muted;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(c.width, mid);
        ctx.stroke();
        return;
      }
      const bar = 3 * dpr;
      const gap = 1 * dpr;
      const n = Math.max(1, Math.floor(c.width / (bar + gap)));
      const cols = peaksToColumns(peaks, n);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < n; i++) {
        const hh = Math.max(dpr, cols[i] * (c.height - 2 * dpr));
        ctx.fillRect(i * (bar + gap), mid - hh / 2, bar, hh);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [peaks]);
  return (
    <canvas
      ref={ref}
      data-testid="mini-wave"
      aria-label={peaks ? "forma d'onda" : "forma d'onda non ancora calcolata"}
      role="img"
      className="h-10 w-full"
    />
  );
}
