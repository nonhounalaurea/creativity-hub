/** Miniature = gradienti generati in modo deterministico da un numero. Nessun asset esterno. */
export function gradientFor(seed: number): string {
  const h1 = (seed * 67 + 20) % 360;
  const h2 = (h1 + 40 + ((seed * 29) % 80)) % 360;
  const angle = (seed * 53) % 360;
  const x = (seed * 37) % 100;
  const y = (seed * 23) % 100;
  return `radial-gradient(120% 140% at ${x}% ${y}%, hsl(${h2} 70% 62% / .55), transparent 60%), linear-gradient(${angle}deg, hsl(${h1} 55% 30%), hsl(${h2} 60% 18%))`;
}
