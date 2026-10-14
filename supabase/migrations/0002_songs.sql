-- Creativity.hub, Fase 3 (canzoni): ritocchi allo schema. Idempotente, rieseguibile.
-- Il codice funziona anche senza questa migrazione (schema 0001): serve solo per
-- miniature con forma d'onda salvate nel database, indici e controlli di coerenza.
-- Applicare dal SQL editor di Supabase dopo 0001_init.sql.

-- picchi compatti (array json di ~200 numeri 0..1) per le miniature nella lista canzoni
alter table public.songs add column if not exists peaks jsonb;

-- indice per la lista ordinata per data
create index if not exists songs_owner_created_idx on public.songs (owner, created_at desc);

-- controlli di coerenza (aggiunti solo se mancano)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'snippets_range_chk') then
    alter table public.snippets
      add constraint snippets_range_chk
      check (from_line >= 0 and to_line >= from_line and start_seconds >= 0 and end_seconds > start_seconds);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'songs_lyrics_shape_chk') then
    alter table public.songs
      add constraint songs_lyrics_shape_chk
      check (lyrics is null or (jsonb_typeof(lyrics) = 'object' and jsonb_typeof(lyrics -> 'lines') = 'array'));
  end if;
end $$;

-- limite di 50 MB per file nel bucket "songs" (piano free); le policy restano quelle di 0001
update storage.buckets set file_size_limit = 52428800 where id = 'songs';
