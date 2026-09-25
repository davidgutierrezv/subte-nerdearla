-- StageCaptions — 003 seed: 3 stages, 4 sessions (2 EN, 2 ES)

insert into public.stages (id, name) values
  ('00000000-0000-4000-a000-000000000001', 'Sala Principal'),
  ('00000000-0000-4000-a000-000000000002', 'Sala Turing'),
  ('00000000-0000-4000-a000-000000000003', 'Sala Lovelace')
on conflict (id) do nothing;

insert into public.sessions (id, stage_id, slug, title, speaker, source_lang, target_langs, glossary) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001',
   'open-source-at-scale', 'Open Source at Scale: Lessons from a Decade of Maintainers', 'Jane Doe',
   'en', '{es,en}', '{GitHub,Kubernetes,CNCF}'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001',
   'ia-en-produccion', 'IA en producción: del prototipo al usuario real', 'Martina López',
   'es', '{es,en}', '{LLM,RAG,Vercel}'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000002',
   'realtime-postgres', 'Realtime Postgres Without the Pain', 'Sam Rivera',
   'en', '{es,en}', '{Supabase,Postgres,WebSocket}'),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000003',
   'accesibilidad-web', 'Accesibilidad web: diseñar para todas las personas', 'Lucía Fernández',
   'es', '{es,en}', '{WCAG,ARIA}')
on conflict (id) do nothing;
