"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Controller dell'elemento <audio>: stato a ~12 Hz, riproduzione di un tratto e riavvolgimento. */
export function usePlayer(url: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rangeEnd = useRef<number | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [rangePlaying, setRangePlaying] = useState<{ start: number; end: number } | null>(null);
  const rangeRef = useRef<{ start: number; end: number } | null>(null);

  const stopRange = useCallback(() => {
    rangeEnd.current = null;
    rangeRef.current = null;
    setRangePlaying(null);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const a = audioRef.current;
      if (!a) return;
      if (rangeEnd.current != null && !a.paused && a.currentTime >= rangeEnd.current) {
        a.pause();
        a.currentTime = rangeRef.current?.start ?? a.currentTime;
        stopRange();
      }
      setTime((t) => (Math.abs(t - a.currentTime) > 0.001 ? a.currentTime : t));
    }, 80);
    return () => window.clearInterval(id);
  }, [stopRange]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.play().catch(() => setError("il browser ha bloccato la riproduzione: premi play"));
  }, []);
  const pause = useCallback(() => {
    audioRef.current?.pause();
    stopRange();
  }, [stopRange]);
  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      stopRange();
      play();
    } else pause();
  }, [pause, play, stopRange]);
  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    const max = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : Infinity;
    a.currentTime = Math.min(Math.max(0, t), max);
    setTime(a.currentTime);
  }, []);
  const rewind = useCallback(
    (seconds: number) => {
      const a = audioRef.current;
      if (a) seek(a.currentTime - seconds);
    },
    [seek],
  );
  const now = useCallback(() => audioRef.current?.currentTime ?? 0, []);
  /** Riproduce solo da start a end, poi si ferma. */
  const playRange = useCallback(
    (start: number, end: number) => {
      const a = audioRef.current;
      if (!a) return;
      rangeEnd.current = end;
      rangeRef.current = { start, end };
      setRangePlaying({ start, end });
      seek(start);
      play();
    },
    [play, seek],
  );

  const audioProps = {
    ref: audioRef,
    src: url ?? undefined,
    preload: "auto" as const,
    onPlay: () => {
      setPlaying(true);
      setError("");
    },
    onPause: () => setPlaying(false),
    onEnded: () => {
      setPlaying(false);
      stopRange();
    },
    onLoadedMetadata: () => {
      const d = audioRef.current?.duration ?? 0;
      if (Number.isFinite(d)) setDuration(d);
    },
    onError: () => setError("non riesco a riprodurre il file audio"),
  };

  return { audioProps, audioRef, time, playing, duration, error, setError, play, pause, toggle, seek, rewind, now, playRange, rangePlaying };
}
