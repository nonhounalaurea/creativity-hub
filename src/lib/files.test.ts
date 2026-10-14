import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/config/songs";
import { fileExtension, fmtBytes, safeFileName, titleFromFileName, uploadErrorMessage, validateAudioFile } from "./files";

describe("nomi file", () => {
  it("safeFileName: ASCII, senza spazi, estensione minuscola", () => {
    expect(safeFileName("Già così (live) v2.MP3")).toBe("Gia-cosi-live-v2.mp3");
    expect(safeFileName("../../etc/passwd.wav")).toBe("etc-passwd.wav");
    expect(safeFileName("***.m4a")).toBe("audio.m4a");
    expect(safeFileName("senza estensione")).toBe("senza-estensione");
    expect(safeFileName("a".repeat(200) + ".mp3").length).toBeLessThanOrEqual(84);
  });
  it("titleFromFileName", () => {
    expect(titleFromFileName("luci_sul_tetto.mp3")).toBe("luci sul tetto");
    expect(titleFromFileName(".mp3")).toBe("senza titolo");
  });
  it("fileExtension", () => {
    expect(fileExtension("a.b.WAV")).toBe("wav");
    expect(fileExtension("nofile")).toBe("");
  });
});

describe("validateAudioFile", () => {
  it("accetta mp3/wav/m4a entro il limite", () => {
    expect(validateAudioFile({ name: "a.mp3", size: 1000 })).toBeNull();
    expect(validateAudioFile({ name: "a.M4A", size: MAX_UPLOAD_BYTES })).toBeNull();
  });
  it("rifiuta formati diversi, file vuoti e file oltre il limite con messaggio leggibile", () => {
    expect(validateAudioFile({ name: "a.ogg", size: 10 })).toContain("formato non supportato");
    expect(validateAudioFile({ name: "a.mp3", size: 0 })).toBe("il file è vuoto");
    expect(validateAudioFile({ name: "a.wav", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/il limite è 50 MB/);
  });
  it("fmtBytes", () => {
    expect(fmtBytes(2048)).toBe("2 KB");
    expect(fmtBytes(52.5 * 1024 * 1024)).toBe("52,5 MB");
  });
});

describe("uploadErrorMessage", () => {
  it("messaggi in italiano per i casi comuni", () => {
    expect(uploadErrorMessage(413)).toContain("50 MB");
    expect(uploadErrorMessage(400, '{"message":"The object exceeded the maximum allowed size"}')).toContain("50 MB");
    expect(uploadErrorMessage(403)).toContain("permesso");
    expect(uploadErrorMessage(409)).toContain("esiste già");
    expect(uploadErrorMessage(0)).toContain("connessione");
    expect(uploadErrorMessage(500)).toContain("500");
  });
});
