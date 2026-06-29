-- ============================================================
-- VETTOR 28 — CRM de Vendas (pipeline de leads)
-- Rode no Supabase: SQL Editor → New query → Run
-- https://supabase.com/dashboard/project/ukxyijgudvyomviivruj/sql/new
-- ============================================================

do $$ begin
  create type lead_stage as enum ('novo','contato','qualificado','proposta','negociacao','ganho','perdido');
  create type lead_temp  as enum ('frio','morno','quente');
exception when duplicate_object then null; end $$;

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,                 -- nome do contato
  empresa         text,
  email           text,
  telefone        text,
  whatsapp        text,
  origem          text,                          -- Indicação, Meta Ads, Tráfego Pago, Site, Outbound...
  segmento        text,
  valor           numeric not null default 0,    -- valor estimado do negócio (R$)
  stage           lead_stage not null default 'novo',
  temperatura     lead_temp  not null default 'morno',
  responsavel_id  uuid references public.profiles(id) on delete set null,
  proxima_acao    text,
  proxima_acao_data date,
  observacoes     text,
  motivo_perda    text,
  ordem           int not null default 0,
  client_id       uuid references public.clients(id) on delete set null,  -- preenchido ao converter
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.leads enable row level security;
drop policy if exists "leads: autenticados leem"    on public.leads;
drop policy if exists "leads: autenticados escrevem" on public.leads;
create policy "leads: autenticados leem"    on public.leads for select using (auth.uid() is not null);
create policy "leads: autenticados escrevem" on public.leads for all    using (auth.uid() is not null);
create index if not exists idx_leads_stage on public.leads(stage);

-- Atividades / histórico do lead
create table if not exists public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  autor_id    uuid references public.profiles(id) on delete set null,
  tipo        text not null default 'nota',      -- nota, ligacao, email, reuniao, whatsapp, proposta
  conteudo    text not null,
  created_at  timestamptz not null default now()
);
alter table public.lead_activities enable row level security;
drop policy if exists "lead_activities: autenticados leem"    on public.lead_activities;
drop policy if exists "lead_activities: autenticados escrevem" on public.lead_activities;
create policy "lead_activities: autenticados leem"    on public.lead_activities for select using (auth.uid() is not null);
create policy "lead_activities: autenticados escrevem" on public.lead_activities for all    using (auth.uid() is not null);
create index if not exists idx_lead_activities_lead on public.lead_activities(lead_id);
