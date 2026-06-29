-- ============================================================
-- VETTOR 28 — Subtarefas (estilo ClickUp)
-- Rode este SQL no Supabase: Dashboard → SQL Editor → New query → Run
-- Link: https://supabase.com/dashboard/project/ukxyijgudvyomviivruj/sql/new
-- ============================================================

create table if not exists public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  titulo      text not null,
  concluida   boolean not null default false,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.subtasks enable row level security;

drop policy if exists "subtasks: autenticados leem"    on public.subtasks;
drop policy if exists "subtasks: autenticados escrevem" on public.subtasks;
create policy "subtasks: autenticados leem"    on public.subtasks for select using (auth.uid() is not null);
create policy "subtasks: autenticados escrevem" on public.subtasks for all    using (auth.uid() is not null);

create index if not exists idx_subtasks_task on public.subtasks(task_id);
