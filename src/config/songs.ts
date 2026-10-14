/** Impostazioni delle canzoni: limiti di upload e parametri dell'editor. */

/** Il piano free di Supabase consente 50 MB per file. */
export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = ["mp3", "wav", "m4a"] as const;
export const ACCEPT_ATTR = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a";

export const SONGS_BUCKET = "songs";
/** Validità dei signed URL (il bucket è privato). */
export const SIGNED_URL_SECONDS = 6 * 60 * 60;

/** Editor di sincronizzazione. */
export const REWIND_SECONDS = 3;
export const NUDGE_SECONDS = 0.05;
