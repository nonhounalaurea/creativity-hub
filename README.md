# Creativity.hub

App personale per generare brevi video (max 20 s) con testo sincronizzato su una canzone.
Fase 1: scaffold con interfaccia e dati finti. Fase 2: login (Supabase Auth) e schema database; le pagine usano ancora i dati finti.

## Avvio

```bash
npm install
cp .env.example .env.local   # poi compila le variabili Supabase (vedi sotto)
npm run dev                  # http://localhost:3000  (/ porta a /create)
npm run build && npm start   # produzione
```

Pronto per Vercel: importa il repo e imposta le variabili d'ambiente Supabase (Project Settings > Environment Variables).

## Struttura

```
src/config/format.ts   ASPECT_RATIO e MAX_DURATION_SECONDS (unico punto)
src/config/app.ts      nome app e voci di menu
src/app/               rotte: /create /readys /cores /songs /looks
src/app/globals.css    tema: --accent, --bg, --surface, --border, --text
src/components/        Sidebar, Preview, list (ricerca/ordina/vista), create/*
src/middleware.ts      sessione Supabase + redirect a /login
src/lib/supabase/      client browser/server
src/app/login/         pagina di accesso
supabase/              migrazioni SQL e istruzioni
src/mock/              dati finti (songs, cores, looks, readys)
src/lib/gradient.ts    miniature = gradienti generati
e2e/                   test Playwright + screenshot
```

## Auth, env e database

- Accesso solo con email + password; niente registrazione pubblica. Tutte le rotte tranne `/login`
  richiedono sessione (middleware). La barra laterale mostra l'email e il pulsante "esci".
- Variabili (`.env.local` e Vercel): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  Solo chiave publishable: mai secret/service_role.
- Schema + RLS + bucket storage privati: `supabase/migrations/0001_init.sql`.
  Come applicarlo, creare l'utente e disattivare i signup: `supabase/README.md`.

## Personalizzare

- Colore d'accento: cambia `--accent` in `src/app/globals.css` (sezione `:root`).
- Formato video: cambia `ASPECT_RATIO` in `src/config/format.ts` (es. `9 / 16`).
  Il layout lo espone come variabile CSS `--ar` e tutte le anteprime (classe `.ar-box`) la usano.

## Test

```bash
npx playwright install chromium
npm run test:e2e   # avvia il dev server sulla porta 3100
```

Senza `E2E_EMAIL` e `E2E_PASSWORD` girano i test di auth (redirect a /login, errore con credenziali sbagliate)
e la build; il login riuscito e i test di pagina della Fase 1 vengono saltati. Con un utente reale:

```bash
E2E_EMAIL=tu@example.com E2E_PASSWORD=... npm run test:e2e
```

I test cambiano temporaneamente `ASPECT_RATIO` e `--accent` e li ripristinano a fine prova.
Gli screenshot di /create finiscono in `e2e/screenshots/`.
