# Creativity.hub

App personale per generare brevi video (max 20 s) con testo sincronizzato su una canzone.
Fase 1: scaffold con interfaccia e dati finti (nessun backend, nessun render reale).

## Avvio

```bash
npm install
cp .env.example .env.local   # facoltativo
npm run dev                  # http://localhost:3000  (/ porta a /create)
npm run build && npm start   # produzione
```

Pronto per Vercel: importa il repo, nessuna configurazione particolare.

## Struttura

```
src/config/format.ts   ASPECT_RATIO e MAX_DURATION_SECONDS (unico punto)
src/config/app.ts      nome app e voci di menu
src/app/               rotte: /create /readys /cores /songs /looks
src/app/globals.css    tema: --accent, --bg, --surface, --border, --text
src/components/        Sidebar, Preview, list (ricerca/ordina/vista), create/*
src/mock/              dati finti (songs, cores, looks, readys)
src/lib/gradient.ts    miniature = gradienti generati
e2e/                   test Playwright + screenshot
```

## Personalizzare

- Colore d'accento: cambia `--accent` in `src/app/globals.css` (sezione `:root`).
- Formato video: cambia `ASPECT_RATIO` in `src/config/format.ts` (es. `9 / 16`).
  Il layout lo espone come variabile CSS `--ar` e tutte le anteprime (classe `.ar-box`) la usano.

## Test

```bash
npx playwright install chromium
npm run test:e2e   # avvia il dev server sulla porta 3100
```

I test cambiano temporaneamente `ASPECT_RATIO` e `--accent` e li ripristinano a fine prova.
Gli screenshot di /create finiscono in `e2e/screenshots/`.
