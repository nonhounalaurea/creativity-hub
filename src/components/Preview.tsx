import type { HTMLAttributes } from "react";
import { gradientFor } from "@/lib/gradient";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Senza seed = riquadro "nessuno" (tratteggiato). */
  seed?: number;
  selected?: boolean;
};

/**
 * Riquadro anteprima: rapporto sempre derivato da ASPECT_RATIO (classe .ar-box).
 * Ogni elemento ha data-ar per i test di misura.
 */
export default function Preview({ seed, selected, className = "", style, children, ...rest }: Props) {
  const none = seed === undefined;
  return (
    <div
      data-ar=""
      className={`ar-box rounded-xl border ${
        none ? "border-dashed bg-bg" : ""
      } ${selected ? "border-accent" : "border-border"} ${className}`}
      style={{ ...(none ? {} : { background: gradientFor(seed) }), ...style }}
      {...rest}
    >
      {none && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-border" aria-hidden>
          <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {children}
    </div>
  );
}
