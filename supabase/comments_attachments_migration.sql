-- ============================================================
-- VETTOR 28 — Comentários, @menções, anexos e notificações
-- Rode no Supabase: Dashboard → SQL Editor → New query → Run
-- Link: https://supabase.com/dashboard/project/ukxyijgudvyomviivruj/sql/new
-- ============================================================

-- ── 1. Comentários (com @menções) ──────────────────────────
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  autor_id    uuid references public.profiles(id) on delete set null,
  conteudo    text not null,
  mencionados uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists "comments: autenticados leem"    on public.comments;
drop policy if exists "comments: autenticados escrevem" on public.comments;
create policy "comments: autenticados leem"    on public.comments for select using (auth.uid() is not null);
create policy "comments: autenticados escrevem" on public.comments for all    using (auth.uid() is not null);
create index if not exists idx_comments_task on public.comments(task_id);

-- ── 2. Anexos (qualquer tipo de arquivo) ───────────────────
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  autor_id    uuid references public.profiles(id) on delete set null,
  nome        text not null,
  url         text not null,
  path        text,
  tipo        text,
  tamanho     bigint,
  created_at  timestamptz not null default now()
);
alter table public.attachments enable row level security;
drop policy if exists "attachments: autenticados leem"    on public.attachments;
drop policy if exists "attachments: autenticados escrevem" on public.attachments;
create policy "attachments: autenticados leem"    on public.attachments for select using (auth.uid() is not null);
create policy "attachments: autenticados escrevem" on public.attachments for all    using (auth.uid() is not null);
create index if not exists idx_attachments_task on public.attachments(task_id);

-- ── 3. Bucket de arquivos (Storage) ────────────────────────
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', true)
on conflict (id) do nothing;

drop policy if exists "task-files: leitura publica"  on storage.objects;
drop policy if exists "task-files: upload autenticado" on storage.objects;
drop policy if exists "task-files: delete autenticado" on storage.objects;
create policy "task-files: leitura publica"   on storage.objects for select using (bucket_id = 'task-files');
create policy "task-files: upload autenticado" on storage.objects for insert with check (bucket_id = 'task-files' and auth.uid() is not null);
create policy "task-files: delete autenticado" on storage.objects for delete using (bucket_id = 'task-files' and auth.uid() is not null);

-- ── 4. Notificações: permitir criar para OUTROS usuários ───
-- (necessário para notificar quem foi mencionado)
drop policy if exists "notifications: proprias"          on public.notifications;
drop policy if exists "notifications: ler proprias"      on public.notifications;
drop policy if exists "notifications: atualizar proprias" on public.notifications;
drop policy if exists "notifications: deletar proprias"  on public.notifications;
drop policy if exists "notifications: autenticados criam" on public.notifications;
create policy "notifications: ler proprias"       on public.notifications for select using (auth.uid() = user_id);
create policy "notifications: atualizar proprias"  on public.notifications for update using (auth.uid() = user_id);
create policy "notifications: deletar proprias"   on public.notifications for delete using (auth.uid() = user_id);
create policy "notifications: autenticados criam"  on public.notifications for insert with check (auth.uid() is not null);
