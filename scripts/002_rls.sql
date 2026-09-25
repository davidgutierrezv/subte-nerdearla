-- StageCaptions — 002 RLS (PLAN.md §5)
-- Public read on event data; writes only via service role (API routes bypass RLS).

alter table public.stages enable row level security;
alter table public.sessions enable row level security;
alter table public.segments enable row level security;
alter table public.translations enable row level security;
alter table public.session_insights enable row level security;
alter table public.notes enable row level security;
alter table public.logs enable row level security;

drop policy if exists "stages_select_public" on public.stages;
create policy "stages_select_public" on public.stages for select using (true);

drop policy if exists "sessions_select_public" on public.sessions;
create policy "sessions_select_public" on public.sessions for select using (true);

drop policy if exists "segments_select_public" on public.segments;
create policy "segments_select_public" on public.segments for select using (true);

drop policy if exists "translations_select_public" on public.translations;
create policy "translations_select_public" on public.translations for select using (true);

drop policy if exists "session_insights_select_public" on public.session_insights;
create policy "session_insights_select_public" on public.session_insights for select using (true);

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.sessions s where s.id = notes.session_id)
  );
drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

-- logs: RLS enabled with no policies => no public access.
