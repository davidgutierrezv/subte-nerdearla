-- StageCaptions — 001 schema (PLAN.md §5)

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id),
  slug text unique not null,
  title text not null,
  speaker text,
  source_lang text not null check (source_lang in ('en','es')),
  target_langs text[] not null default '{es,en}',
  glossary text[] default '{}',
  mode text not null default 'live' check (mode in ('live','replay')),
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  started_at timestamptz,
  ended_at timestamptz,
  audio_url text,
  video_url text,
  video_offset_ms int default 0
);

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  seq int not null,
  lang text not null,
  text text not null,
  t_start_ms int not null,
  t_end_ms int not null,
  speaker int,
  created_at timestamptz default now(),
  unique (session_id, seq)
);

create table if not exists public.translations (
  segment_id uuid references public.segments(id) on delete cascade,
  lang text not null,
  text text not null,
  primary key (segment_id, lang)
);

create table if not exists public.session_insights (
  session_id uuid references public.sessions(id) on delete cascade,
  kind text check (kind in ('rolling','final')),
  lang text not null,
  payload jsonb not null,
  updated_at timestamptz default now(),
  primary key (session_id, kind, lang)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null default auth.uid(),
  session_id uuid references public.sessions(id) on delete cascade,
  t_ms int not null,
  kind text check (kind in ('note','bookmark')) default 'note',
  body text,
  created_at timestamptz default now()
);

create table if not exists public.logs (
  id bigserial primary key,
  at timestamptz default now(),
  source text,
  level text,
  message text,
  data jsonb
);

create index if not exists sessions_stage_id_idx on public.sessions(stage_id);
create index if not exists segments_session_seq_idx on public.segments(session_id, seq);
create index if not exists notes_user_session_idx on public.notes(user_id, session_id);
