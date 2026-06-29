/**
 * run-schema.mjs
 * Executa o schema SQL completo via Supabase Management API
 */

const PROJECT_REF  = 'ukxyijgudvyomviivruj'
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVreHlpamd1ZHZ5b212aWl2cnVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjYyNjM4OCwiZXhwIjoyMDk4MjAyMzg4fQ.cuzAzB3wKhUUXipyC5Ii2Owl62tK17z_iYcB6Yx7YPA'

// SQL completo do schema
const SCHEMA_SQL = `
-- ENUMs
do $$ begin
  create type user_role          as enum ('admin','gestor','colaborador','cliente');
  create type onboarding_status  as enum ('pendente','em_andamento','concluido');
  create type contract_status    as enum ('ativo','pausado','encerrado');
  create type task_status        as enum ('a_fazer','fazendo','revisao','concluido');
  create type task_priority      as enum ('baixa','media','alta','urgente');
  create type provider_type      as enum ('google_ads','ga4','meta_ads','magazord','manual');
  create type integration_status as enum ('ativo','erro','desconectado');
exception when duplicate_object then null;
end $$;

-- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  email       text not null default '',
  role        user_role not null default 'colaborador',
  avatar_url  text,
  status      text not null default 'ativo',
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Trigger: cria perfil ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'colaborador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- plans
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.plans enable row level security;

-- pillars
create table if not exists public.pillars (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,
  icone       text,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.pillars enable row level security;

-- deliverables
create table if not exists public.deliverables (
  id          uuid primary key default gen_random_uuid(),
  pillar_id   uuid references public.pillars(id) on delete cascade,
  nome        text not null,
  descricao   text,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.deliverables enable row level security;

-- clients
create table if not exists public.clients (
  id                  uuid primary key default gen_random_uuid(),
  nome_empresa        text not null,
  cnpj                text,
  segmento            text,
  plataforma          text,
  responsavel_id      uuid references public.profiles(id) on delete set null,
  contato_nome        text,
  contato_email       text,
  contato_whatsapp    text,
  status_onboarding   onboarding_status not null default 'pendente',
  plano_id            uuid references public.plans(id) on delete set null,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now()
);
alter table public.clients enable row level security;

-- client_assignments
create table if not exists public.client_assignments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  colaborador_id  uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique(client_id, colaborador_id)
);
alter table public.client_assignments enable row level security;

-- contracts
create table if not exists public.contracts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  plano_id      uuid references public.plans(id) on delete set null,
  inicio        date,
  vigencia      date,
  status        contract_status not null default 'ativo',
  valor_mensal  numeric(12,2),
  arquivo_url   text,
  created_at    timestamptz not null default now()
);
alter table public.contracts enable row level security;

-- onboarding_steps
create table if not exists public.onboarding_steps (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.onboarding_steps enable row level security;

-- client_onboarding
create table if not exists public.client_onboarding (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  step_id         uuid not null references public.onboarding_steps(id) on delete cascade,
  status          onboarding_status not null default 'pendente',
  responsavel_id  uuid references public.profiles(id) on delete set null,
  data            date,
  observacao      text,
  created_at      timestamptz not null default now(),
  unique(client_id, step_id)
);
alter table public.client_onboarding enable row level security;

-- client_deliverables
create table if not exists public.client_deliverables (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  deliverable_id  uuid not null references public.deliverables(id) on delete cascade,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  unique(client_id, deliverable_id)
);
alter table public.client_deliverables enable row level security;

-- tasks
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  pillar_id       uuid references public.pillars(id) on delete set null,
  titulo          text not null,
  descricao       text,
  responsavel_id  uuid references public.profiles(id) on delete set null,
  status          task_status not null default 'a_fazer',
  prioridade      task_priority not null default 'media',
  prazo           date,
  created_at      timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- integrations
create table if not exists public.integrations (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  provider         provider_type not null,
  status           integration_status not null default 'ativo',
  account_id       text,
  credentials_enc  text,
  config           jsonb,
  last_sync_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique(client_id, provider)
);
alter table public.integrations enable row level security;

-- metrics_daily
create table if not exists public.metrics_daily (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  provider        provider_type not null,
  date            date not null,
  spend           numeric(14,4),
  impressions     bigint,
  clicks          bigint,
  ctr             numeric(8,4),
  purchases       integer,
  purchase_value  numeric(14,4),
  roas            numeric(8,4),
  cac             numeric(14,4),
  sessions        integer,
  users           integer,
  new_users       integer,
  orders          integer,
  revenue         numeric(14,4),
  avg_ticket      numeric(14,4),
  created_at      timestamptz not null default now(),
  unique(client_id, provider, date)
);
alter table public.metrics_daily enable row level security;

-- audit_log
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   uuid,
  payload     jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
alter table public.audit_log enable row level security;

-- notifications
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tipo        text not null,
  mensagem    text not null,
  link        text,
  lida        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.notifications enable row level security;

-- RLS helper functions
create or replace function public.is_admin_or_gestor()
returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','gestor'))
$$;

create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- RLS Policies
drop policy if exists "profiles: leitura propria" on public.profiles;
drop policy if exists "profiles: admins leem tudo" on public.profiles;
drop policy if exists "profiles: atualizacao propria" on public.profiles;
drop policy if exists "profiles: admin atualiza qualquer" on public.profiles;
create policy "profiles: leitura propria" on public.profiles for select using (auth.uid() = id);
create policy "profiles: admins leem tudo" on public.profiles for select using (public.is_admin_or_gestor());
create policy "profiles: atualizacao propria" on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin atualiza qualquer" on public.profiles for update using (public.is_admin());

drop policy if exists "plans: autenticados leem" on public.plans;
drop policy if exists "plans: admin escreve" on public.plans;
create policy "plans: autenticados leem" on public.plans for select using (auth.uid() is not null);
create policy "plans: admin escreve" on public.plans for all using (public.is_admin_or_gestor());

drop policy if exists "pillars: autenticados leem" on public.pillars;
drop policy if exists "pillars: admin escreve" on public.pillars;
create policy "pillars: autenticados leem" on public.pillars for select using (auth.uid() is not null);
create policy "pillars: admin escreve" on public.pillars for all using (public.is_admin_or_gestor());

drop policy if exists "deliverables: autenticados leem" on public.deliverables;
drop policy if exists "deliverables: admin escreve" on public.deliverables;
create policy "deliverables: autenticados leem" on public.deliverables for select using (auth.uid() is not null);
create policy "deliverables: admin escreve" on public.deliverables for all using (public.is_admin_or_gestor());

drop policy if exists "clients: autenticados leem" on public.clients;
drop policy if exists "clients: admin escreve" on public.clients;
create policy "clients: autenticados leem" on public.clients for select using (auth.uid() is not null);
create policy "clients: admin escreve" on public.clients for all using (public.is_admin_or_gestor());

drop policy if exists "tasks: autenticados leem" on public.tasks;
drop policy if exists "tasks: autenticados escrevem" on public.tasks;
create policy "tasks: autenticados leem" on public.tasks for select using (auth.uid() is not null);
create policy "tasks: autenticados escrevem" on public.tasks for all using (auth.uid() is not null);

drop policy if exists "integrations: autenticados leem" on public.integrations;
drop policy if exists "integrations: admin escreve" on public.integrations;
create policy "integrations: autenticados leem" on public.integrations for select using (auth.uid() is not null);
create policy "integrations: admin escreve" on public.integrations for all using (public.is_admin_or_gestor());

drop policy if exists "metrics: autenticados leem" on public.metrics_daily;
drop policy if exists "metrics: service role escreve" on public.metrics_daily;
create policy "metrics: autenticados leem" on public.metrics_daily for select using (auth.uid() is not null);
create policy "metrics: service role escreve" on public.metrics_daily for all using (auth.uid() is not null);

drop policy if exists "assignments: autenticados leem" on public.client_assignments;
drop policy if exists "assignments: admin escreve" on public.client_assignments;
create policy "assignments: autenticados leem" on public.client_assignments for select using (auth.uid() is not null);
create policy "assignments: admin escreve" on public.client_assignments for all using (public.is_admin_or_gestor());

drop policy if exists "contracts: autenticados" on public.contracts;
create policy "contracts: autenticados" on public.contracts for all using (auth.uid() is not null);

drop policy if exists "onboarding_steps: autenticados leem" on public.onboarding_steps;
drop policy if exists "onboarding_steps: admin escreve" on public.onboarding_steps;
create policy "onboarding_steps: autenticados leem" on public.onboarding_steps for select using (auth.uid() is not null);
create policy "onboarding_steps: admin escreve" on public.onboarding_steps for all using (public.is_admin_or_gestor());

drop policy if exists "client_onboarding: autenticados" on public.client_onboarding;
create policy "client_onboarding: autenticados" on public.client_onboarding for all using (auth.uid() is not null);

drop policy if exists "client_deliverables: autenticados" on public.client_deliverables;
create policy "client_deliverables: autenticados" on public.client_deliverables for all using (auth.uid() is not null);

drop policy if exists "audit: autenticados inserem" on public.audit_log;
drop policy if exists "audit: admin le" on public.audit_log;
create policy "audit: autenticados inserem" on public.audit_log for insert with check (auth.uid() is not null);
create policy "audit: admin le" on public.audit_log for select using (public.is_admin());

drop policy if exists "notifications: proprias" on public.notifications;
create policy "notifications: proprias" on public.notifications for all using (auth.uid() = user_id);

-- Indices
create index if not exists idx_clients_ativo       on public.clients(ativo);
create index if not exists idx_tasks_client         on public.tasks(client_id);
create index if not exists idx_tasks_status         on public.tasks(status);
create index if not exists idx_metrics_client_date  on public.metrics_daily(client_id, date desc);
create index if not exists idx_metrics_date         on public.metrics_daily(date desc);
create index if not exists idx_integrations_client  on public.integrations(client_id);
create index if not exists idx_audit_actor          on public.audit_log(actor_id);
create index if not exists idx_notif_user           on public.notifications(user_id, lida);

-- Seed: Pilares
insert into public.pillars (nome, slug, ordem) values
  ('Tecnologia',  'tecnologia',  1),
  ('Marketing',   'marketing',   2),
  ('Gestao',      'gestao',      3),
  ('Atendimento', 'atendimento', 4)
on conflict (slug) do nothing;

-- Seed: Planos
insert into public.plans (nome, descricao, ordem) values
  ('Saturno',   'Plano de entrada',    1),
  ('Falcon',    'Plano intermediario', 2),
  ('Apollo',    'Plano avancado',      3),
  ('Nemesis',   'Plano premium',       4)
on conflict do nothing;

-- Seed: Etapas de Onboarding
insert into public.onboarding_steps (nome, descricao, ordem) values
  ('Kickoff',                 'Reuniao de alinhamento inicial',         1),
  ('Acesso as plataformas',   'Recebimento de acessos e credenciais',   2),
  ('Auditoria inicial',       'Analise do historico de conta',          3),
  ('Setup de pixels/tags',    'Configuracao de rastreamento',           4),
  ('Criacao de campanhas',    'Estrutura inicial de campanhas',         5),
  ('Periodo de aprendizado',  'Fase de otimizacao do algoritmo',        6),
  ('Relatorio de onboarding', 'Primeiro relatorio de performance',      7),
  ('Revisao 30 dias',         'Revisao completa apos 30 dias',          8)
on conflict do nothing;
`

async function runSql(sql, label) {
  process.stdout.write(`  → ${label}... `)
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  
  if (res.ok) {
    console.log('✅')
    return true
  }
  
  const txt = await res.text()
  // Se for 401/403, a Management API precisa de PAT (não service role)
  if (res.status === 401 || res.status === 403) {
    console.log('⚠️  (precisa de PAT da Management API)')
    return false
  }
  console.log(`❌ ${res.status}: ${txt.slice(0, 100)}`)
  return false
}

async function main() {
  console.log('\n='.repeat(60))
  console.log('  VETTOR 28 — Executando Schema SQL')
  console.log('='.repeat(60) + '\n')
  
  // Tenta a Management API do Supabase
  const ok = await runSql(SCHEMA_SQL, 'Schema completo via Management API')
  
  if (!ok) {
    console.log('\n⚠️  A Management API requer Personal Access Token (diferente do service_role).')
    console.log('\n📋 EXECUTE MANUALMENTE no SQL Editor do Supabase:')
    console.log('   https://supabase.com/dashboard/project/ukxyijgudvyomviivruj/sql/new\n')
    console.log('   1. Acesse o link acima')
    console.log('   2. Cole o conteúdo do arquivo schema_vettor28.sql')
    console.log('   3. Clique em "Run"\n')
    
    // Cria o perfil do admin diretamente via REST (como o usuário já existe)
    console.log('📝 Tentando criar perfil admin via REST...')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      'https://ukxyijgudvyomviivruj.supabase.co',
      SERVICE_ROLE,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    // Aguarda tabelas existirem e cria o perfil
    const { error } = await supabase.from('profiles').upsert({
      id: '9e1cbc2f-aaa9-4e7b-9ff8-85c77e7516ce',
      email: 'psycomunic@gmail.com',
      nome: 'Administrador VETTOR 28',
      role: 'admin',
      status: 'ativo'
    })
    
    if (error) {
      console.log(`   ⚠️  Perfil será criado automaticamente após o schema ser executado.`)
    } else {
      console.log('   ✅ Perfil admin criado!')
    }
  }
  
  console.log('\n🔑 CREDENCIAIS DE LOGIN:')
  console.log('   Email: psycomunic@gmail.com')
  console.log('   Senha: Vettor28@2026')
  console.log('\n🌐 http://localhost:3000/login\n')
}

main().catch(console.error)
