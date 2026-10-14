# Supabase

## 1. Applicare lo schema

1. Dashboard Supabase > **SQL Editor** > New query.
2. Incolla il contenuto di `migrations/0001_init.sql` ed esegui (Run).
   Il file è idempotente: si può rieseguire senza errori.
3. Controlla in **Table Editor** (songs, snippets, cores, clips, looks, readys, tutte con RLS attiva)
   e in **Storage** (bucket privati `songs`, `clips`, `readys`).

Ogni utente vede e scrive solo le proprie righe (`owner = auth.uid()`; snippets e clips via join sul padre)
e solo i file sotto il prefisso `<user id>/` dei bucket (es. `songs/<user id>/brano.mp3`).

## 2. Creare l'utente (nessuna registrazione pubblica)

1. **Authentication > Users > Add user > Create new user**.
2. Inserisci email e password e spunta **Auto Confirm User**.

## 3. Disabilitare i signup pubblici

**Authentication > Sign In / Providers** > in "User Signups" disattiva **Allow new users to sign up**
(salva). Da quel momento gli utenti si creano solo a mano dalla dashboard.

## 4. Variabili d'ambiente

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings > API),
in `.env.local` e su Vercel. Mai chiavi secret/service_role nel frontend.
