/** Utilità pure per i file audio caricati. */
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/config/songs";

export function fileExtension(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Nome sicuro per lo storage: ASCII, senza spazi, massimo 80 caratteri, estensione conservata. */
export function safeFileName(name: string): string {
  const ext = fileExtension(name);
  const base = ext ? name.trim().slice(0, -(ext.length + 1)) : name.trim();
  const clean = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${clean || "audio"}${ext ? `.${ext}` : ""}`;
}

/** Titolo proposto dal nome file: niente estensione, underscore/trattini bassi come spazi. */
export function titleFromFileName(name: string): string {
  const ext = fileExtension(name);
  const base = ext ? name.slice(0, -(ext.length + 1)) : name;
  const t = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return t || "senza titolo";
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Messaggio d'errore leggibile o null se il file va bene. */
export function validateAudioFile(file: { name: string; size: number }): string | null {
  const ext = fileExtension(file.name);
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `formato non supportato: usa ${ACCEPTED_EXTENSIONS.join(", ")}`;
  }
  if (file.size <= 0) return "il file è vuoto";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `il file pesa ${fmtBytes(file.size)}: il limite è ${MAX_UPLOAD_MB} MB per file`;
  }
  return null;
}

/** Traduce l'errore dell'API storage in un messaggio leggibile. */
export function uploadErrorMessage(status: number, body = ""): string {
  const b = body.toLowerCase();
  if (status === 413 || b.includes("maximum allowed size") || b.includes("too large")) {
    return `il file supera il limite di ${MAX_UPLOAD_MB} MB`;
  }
  if (status === 401 || status === 403) return "sessione scaduta o permesso negato: esci e rientra";
  if (status === 409 || b.includes("already exists")) return "esiste già un file con questo nome, riprova";
  if (status === 0) return "connessione interrotta durante il caricamento";
  return `caricamento non riuscito (errore ${status})`;
}
