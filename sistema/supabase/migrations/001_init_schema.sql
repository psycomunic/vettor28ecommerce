-- ============================================================
-- VETTOR 28 — Migration 001: Schema inicial
-- ============================================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'colaborador', 'cliente');
CREATE TYPE onboarding_status AS ENUM ('pendente', 'em_andamento', 'concluido');
CREATE TYPE contract_status AS ENUM ('ativo', 'pausado', 'encerrado');
CREATE TYPE task_status AS ENUM ('a_fazer', 'fazendo', 'revisao', 'concluido');
CREATE TYPE task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE provider_type AS ENUM ('google_ads', 'ga4', 'meta_ads', 'magazord', 'manual');
CREATE TYPE report_status AS ENUM ('rascunho', 'revisao', 'publicado');

-- ============================================================
-- PROFILES (estende auth.users do Supabase)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'colaborador',
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'colaborador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- PLANOS
-- ============================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  segmento TEXT,
  plataforma TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contato_nome TEXT,
  contato_email TEXT,
  contato_whatsapp TEXT,
  status_onboarding onboarding_status DEFAULT 'pendente',
  plano_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATRIBUIÇÕES (colaborador ↔ cliente)
-- ============================================================
CREATE TABLE client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(colaborador_id, client_id)
);

-- ============================================================
-- PILARES
-- ============================================================
CREATE TABLE pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icone TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEMBER_SERVICES (colaborador ↔ pilar permitido)
-- ============================================================
CREATE TABLE member_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pilar_id UUID NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(colaborador_id, pilar_id)
);

-- ============================================================
-- ENTREGÁVEIS
-- ============================================================
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id UUID NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENTREGÁVEIS POR CLIENTE
-- ============================================================
CREATE TABLE client_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, deliverable_id)
);

-- ============================================================
-- CONTRATOS
-- ============================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  inicio DATE,
  vigencia DATE,
  status contract_status DEFAULT 'ativo',
  valor_mensal NUMERIC, -- NULL = somente admin/gestor vê
  arquivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAREFAS (Kanban)
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pillar_id UUID REFERENCES pillars(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status task_status DEFAULT 'a_fazer',
  prioridade task_priority DEFAULT 'media',
  prazo DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ONBOARDING
-- ============================================================
CREATE TABLE onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  status onboarding_status DEFAULT 'pendente',
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, step_id)
);

-- ============================================================
-- INTEGRAÇÕES
-- ============================================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider provider_type NOT NULL,
  status TEXT DEFAULT 'desconectado',
  account_id TEXT,
  encrypted_tokens TEXT, -- criptografado via pgcrypto / Supabase Vault
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, provider)
);

-- ============================================================
-- MÉTRICAS DIÁRIAS (normalized KPIs)
-- ============================================================
CREATE TABLE metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider provider_type NOT NULL,
  date DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, provider, date, metric_key)
);

-- KPIs derivados (ROAS, CAC, ticket médio) são CALCULADOS em tempo de
-- consulta a partir de metrics_daily — não duplicamos dados.

-- ============================================================
-- RELATÓRIOS
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL, -- ex: "2025-01"
  status report_status DEFAULT 'rascunho',
  resumo TEXT,
  comentarios TEXT,
  proximos_passos TEXT,
  pdf_url TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- ex: 'relatorio_publicado', 'tarefa_atrasada', 'integracao_falha'
  mensagem TEXT NOT NULL,
  link TEXT,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- ex: 'client.create', 'report.publish', 'user.invite'
  entity TEXT,          -- ex: 'clients', 'reports'
  entity_id UUID,
  payload JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX idx_clients_ativo ON clients(ativo);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_metrics_client_date ON metrics_daily(client_id, date);
CREATE INDEX idx_notifications_user_lida ON notifications(user_id, lida);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
