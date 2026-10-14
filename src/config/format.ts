/**
 * Formato video: UNICO punto di verità.
 * Tutte le anteprime (readys, core, look...) derivano da qui:
 * il layout imposta la variabile CSS --ar e la classe .ar-box usa aspect-ratio.
 *
 * Esempi: 19 / 6 (ultra-wide, default), 16 / 9, 9 / 16 (verticale).
 */
export const ASPECT_RATIO = 19 / 6;

/** Durata massima di un video, in secondi. */
export const MAX_DURATION_SECONDS = 20;
