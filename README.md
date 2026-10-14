# Creativity.hub

App personale per generare brevi video (max 20 s) con testo sincronizzato su una canzone.
Fase 1: scaffold con interfaccia e dati finti. Fase 2: login (Supabase Auth) e schema database.
Fase 3: canzoni vere (upload, testo, sincronizzazione manuale, snippet); core, look e readys usano ancora i dati finti.

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
src/config/songs.ts    limite upload (50 MB), formati, passi di riavvolgimento e nudge
src/lib/lyrics.ts      logica pura dei testi: parsing, tempi, parole, snippet, limite 20 s
src/lib/waveform.ts    calcolo dei picchi della forma d'onda
src/lib/files.ts       nomi file sicuri, validazione upload, messaggi d'errore
src/lib/songs.ts       accesso a songs/snippets/storage (browser, sessione dell'utente)
src/components/songs/  lista canzoni, dettaglio, editor di sincronizzazione, forma d'onda
src/mock/              dati finti (cores, looks, readys; songs non è più usato)
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

## Canzoni (Fase 3)

**/songs**: elenco reale delle tue canzoni (griglia o lista), ricerca, ordinamento e filtro
tutte / analizzate (testo sincronizzato) / non analizzate. "carica canzone" accetta mp3, wav e m4a
**fino a 50 MB per file** (limite del piano free di Supabase): oltre mostra un errore leggibile.
Il file va nel bucket privato `songs` come `<user_id>/<uuid>-<nomefile>`, con barra di avanzamento;
la durata si legge dal file e si crea la riga in `songs`. Rinomina ed elimina (riga + file) sono sulla card.
Il file audio è servito con signed URL (6 ore, rinnovabili con "riprova").

**/songs/[id]**: player, forma d'onda (Web Audio `decodeAudioData` a 11 kHz, picchi a ~50/s, disegnata su canvas;
se la decodifica fallisce resta un messaggio e tutto il resto funziona), e tre schede:

1. **testo**: incolla il testo, una riga per verso (le righe vuote sono ignorate). Se lo modifichi, le righe
   rimaste uguali tengono il loro tempo.
2. **sync** (tap to sync): mentre la canzone suona assegni l'inizio della riga "prossima" con la barra spaziatrice
   o col pulsante grande. Correzione fine: trascina i marcatori sulla forma d'onda, scrivi il tempo nel campo
   numerico (inizio e fine) o usa i pulsanti -0,05 / +0,05. Zoom orizzontale con + e - (scorrimento col dito su mobile).
   "salva tempi" scrive il testo sincronizzato; con tutte le righe a tempo `songs.analyzed = true` ("testo pronto").
3. **snippet**: scegli riga "da" e "a" (selettori, clic sulle righe, oppure la riga sotto il cursore di riproduzione).
   Max 20 s (`MAX_DURATION_SECONDS`): oltre non si salva e "adatta a 20 s" accorcia alla riga che ci sta.
   Più snippet per canzone, ascolto del solo tratto, elimina.

**/create** usa le canzoni vere: dopo la scelta compaiono i suoi snippet (con prima e ultima riga reali, uno solo si
sceglie da solo); "modifica" apre /songs/[id]. `ready` richiede canzone + snippet + core (i core sono ancora finti).
Shuffle sceglie una canzone a caso tra le tue.

### Scorciatoie (scheda sync)

| tasto | azione |
| --- | --- |
| spazio | avvia la canzone; poi assegna il tempo alla riga prossima |
| p | play / pausa |
| r | riavvolgi di 3 s |
| z | annulla l'ultima modifica |
| su / giu | seleziona la riga precedente / successiva |
| sinistra / destra | sposta la riga selezionata di 0,05 s (maiusc: 0,5 s) |
| + / - | zoom della forma d'onda |

Le scorciatoie sono disattivate mentre scrivi in un campo. Fuori dalla scheda sync, spazio = play/pausa.

### Formato `songs.lyrics` (jsonb)

```json
{
  "version": 1,
  "lines": [
    {
      "text": "accendo le luci sul tetto",
      "start": 12.34,
      "end": 15.1,
      "words": [{ "text": "accendo", "start": 12.34, "end": 12.9 }]
    },
    { "text": "riga non ancora sincronizzata", "start": null, "end": null }
  ]
}
```

- `start`/`end` in secondi; `null` = riga senza tempo. `end` è derivato dall'inizio della riga successiva con tempo
  (l'ultima dura al massimo 5 s, entro la durata del brano) e si può accorciare a mano.
- `words` (facoltativo) è generato al salvataggio dalle righe con tempo: tempi proporzionali alla lunghezza delle
  parole (`splitWords` in `src/lib/lyrics.ts`). Non è una sincronizzazione parola per parola reale.
- `snippets` conserva `from_line`/`to_line` (indici 0-based delle righe) e i secondi `start_seconds`/`end_seconds`
  copiati al momento del salvataggio: se poi ritocchi i tempi di una canzone, rifai gli snippet interessati.

Migrazione facoltativa `supabase/migrations/0002_songs.sql` (colonna `peaks` per le miniature, indici, controlli):
il codice funziona anche senza. Senza la colonna le miniature della lista usano i picchi calcolati in questo browser
(localStorage); una canzone mai aperta qui mostra una linea tratteggiata.

## Personalizzare

- Colore d'accento: cambia `--accent` in `src/app/globals.css` (sezione `:root`).
- Formato video: cambia `ASPECT_RATIO` in `src/config/format.ts` (es. `9 / 16`).
  Il layout lo espone come variabile CSS `--ar` e tutte le anteprime (classe `.ar-box`) la usano.

## Test

```bash
npm run test:unit  # vitest: logica pura (lyrics, waveform, files)
npm run typecheck  # tsc --noEmit
npx playwright install chromium
npm run test:e2e   # avvia il dev server sulla porta 3100
```

Senza `E2E_EMAIL` e `E2E_PASSWORD` girano i test di auth (redirect a /login, errore con credenziali sbagliate)
e la build; il login riuscito e i test di pagina della Fase 1 vengono saltati. Con un utente reale:

```bash
E2E_EMAIL=tu@example.com E2E_PASSWORD=... npm run test:e2e
```

`e2e/songs.spec.ts` (upload di un wav generato, sync a tastiera, snippet, persistenza dopo reload, /create) gira
solo con le credenziali: crea brani con prefisso `e2e-fase3-` nel tuo account e li elimina a fine prova.
Anche i test di pagina della Fase 1 creano (e rimuovono) un brano di prova con snippet, perché /create ora legge dati veri.

I test cambiano temporaneamente `ASPECT_RATIO` e `--accent` e li ripristinano a fine prova.
Gli screenshot di /create finiscono in `e2e/screenshots/`.
