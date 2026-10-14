-- Creativity.hub: schema iniziale (idempotente, rieseguibile).
-- Applicare dal SQL editor di Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabelle
create table if not exists public.songs (
  id               uuid primary key default gen_random_uuid(),
  owner            uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title            text not null,
  artist           text,
  file_path        text,
  duration_seconds numeric,
  lyrics           jsonb,
  analyzed         boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.snippets (
  id            uuid primary key default gen_random_uuid(),
  song_id       uuid not null references public.songs (id) on delete cascade,
  from_line     int not null,
  to_line       int not null,
  start_seconds numeric not null,
  end_seconds   numeric not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.cores (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  folder     text,
  created_at timestamptz not null default now()
);

create table if not exists public.clips (
  id               uuid primary key default gen_random_uuid(),
  core_id          uuid not null references public.cores (id) on delete cascade,
  file_path        text not null,
  duration_seconds numeric,
  created_at       timestamptz not null default now()
);

create table if not exists public.looks (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null,
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.readys (
  id               uuid primary key default gen_random_uuid(),
  owner            uuid not null references auth.users (id) on delete cascade default auth.uid(),
  song_id          uuid references public.songs (id) on delete set null,
  snippet_id       uuid references public.snippets (id) on delete set null,
  core_ids         uuid[] not null default '{}',
  look_config      jsonb not null default '{}'::jsonb,
  file_path        text,
  status           text not null default 'queued',
  duration_seconds numeric,
  created_at       timestamptz not null default now()
);

create index if not exists songs_owner_idx    on public.songs (owner);
create index if not exists snippets_song_idx  on public.snippets (song_id);
create index if not exists cores_owner_idx    on public.cores (owner);
create index if not exists clips_core_idx     on public.clips (core_id);
create index if not exists looks_owner_idx    on public.looks (owner);
create index if not exists readys_owner_idx   on public.readys (owner);

-- -------------------------------------------------------------------- RLS
alter table public.songs    enable row level security;
alter table public.snippets enable row level security;
alter table public.cores    enable row level security;
alter table public.clips    enable row level security;
alter table public.looks    enable row level security;
alter table public.readys   enable row level security;

-- tabelle con colonna owner
drop policy if exists "songs: solo proprietario" on public.songs;
create policy "songs: solo proprietario" on public.songs
  for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "cores: solo proprietario" on public.cores;
create policy "cores: solo proprietario" on public.cores
  for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "looks: solo proprietario" on public.looks;
create policy "looks: solo proprietario" on public.looks
  for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- readys: owner = utente, e se indicati song/snippet devono essere suoi
drop policy if exists "readys: solo proprietario" on public.readys;
create policy "readys: solo proprietario" on public.readys
  for all to authenticated
  using (owner = auth.uid())
  with check (
    owner = auth.uid()
    and (song_id is null or exists (select 1 from public.songs s where s.id = song_id and s.owner = auth.uid()))
    and (snippet_id is null or exists (
      select 1 from public.snippets sn join public.songs s on s.id = sn.song_id
      where sn.id = snippet_id and s.owner = auth.uid()))
  );

-- tabelle figlie: accesso via join sul padre
drop policy if exists "snippets: via canzone" on public.snippets;
create policy "snippets: via canzone" on public.snippets
  for all to authenticated
  using (exists (select 1 from public.songs s where s.id = song_id and s.owner = auth.uid()))
  with check (exists (select 1 from public.songs s where s.id = song_id and s.owner = auth.uid()));

drop policy if exists "clips: via core" on public.clips;
create policy "clips: via core" on public.clips
  for all to authenticated
  using (exists (select 1 from public.cores c where c.id = core_id and c.owner = auth.uid()))
  with check (exists (select 1 from public.cores c where c.id = core_id and c.owner = auth.uid()));

-- ---------------------------------------------------------------- storage
-- bucket privati; i file stanno sotto "<auth.uid()>/..."
insert into storage.buckets (id, name, public)
values ('songs', 'songs', false), ('clips', 'clips', false), ('readys', 'readys', false)
on conflict (id) do update set public = false;

drop policy if exists "hub storage: select proprio prefisso" on storage.objects;
create policy "hub storage: select proprio prefisso" on storage.objects
  for select to authenticated
  using (bucket_id in ('songs', 'clips', 'readys') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "hub storage: insert proprio prefisso" on storage.objects;
create policy "hub storage: insert proprio prefisso" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('songs', 'clips', 'readys') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "hub storage: update proprio prefisso" on storage.objects;
create policy "hub storage: update proprio prefisso" on storage.objects
  for update to authenticated
  using (bucket_id in ('songs', 'clips', 'readys') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('songs', 'clips', 'readys') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "hub storage: delete proprio prefisso" on storage.objects;
create policy "hub storage: delete proprio prefisso" on storage.objects
  for delete to authenticated
  using (bucket_id in ('songs', 'clips', 'readys') and (storage.foldername(name))[1] = auth.uid()::text);
