-- ============================================================
-- VETTOR 28 — Migration 002: Row Level Security (RLS)
-- ============================================================
-- Habilita RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Funções auxiliares para verificar papel do usuário atual
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'gestor') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica se o colaborador tem acesso a um client_id
CREATE OR REPLACE FUNCTION public.has_client_access(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_assignments
    WHERE colaborador_id = auth.uid() AND client_id = p_client_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
-- Admin vê todos; usuário vê o próprio perfil
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin_or_gestor());

-- Usuário edita o próprio; admin edita qualquer um
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_admin());

-- Somente admin pode inserir/excluir
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (is_admin());

-- ============================================================
-- PLANS
-- ============================================================
CREATE POLICY "plans_select" ON plans FOR SELECT
  USING (TRUE); -- todos autenticados podem ver planos

CREATE POLICY "plans_write" ON plans FOR ALL
  USING (is_admin());

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (
    is_admin_or_gestor()
    OR has_client_access(id)  -- colaborador com atribuição
    OR id = (                 -- cliente vê a própria empresa
      SELECT client_id FROM client_assignments ca
      JOIN profiles p ON p.id = ca.colaborador_id
      WHERE p.id = auth.uid() AND p.role = 'cliente'
      LIMIT 1
    )
  );

CREATE POLICY "clients_insert" ON clients FOR INSERT
  WITH CHECK (is_admin_or_gestor());

CREATE POLICY "clients_update" ON clients FOR UPDATE
  USING (is_admin_or_gestor());

CREATE POLICY "clients_delete" ON clients FOR DELETE
  USING (is_admin());

-- ============================================================
-- CLIENT_ASSIGNMENTS
-- ============================================================
CREATE POLICY "assignments_select" ON client_assignments FOR SELECT
  USING (is_admin_or_gestor() OR colaborador_id = auth.uid());

CREATE POLICY "assignments_write" ON client_assignments FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- PILLARS
-- ============================================================
CREATE POLICY "pillars_select" ON pillars FOR SELECT
  USING (TRUE);

CREATE POLICY "pillars_write" ON pillars FOR ALL
  USING (is_admin());

-- ============================================================
-- MEMBER_SERVICES
-- ============================================================
CREATE POLICY "member_services_select" ON member_services FOR SELECT
  USING (is_admin_or_gestor() OR colaborador_id = auth.uid());

CREATE POLICY "member_services_write" ON member_services FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- DELIVERABLES
-- ============================================================
CREATE POLICY "deliverables_select" ON deliverables FOR SELECT
  USING (TRUE);

CREATE POLICY "deliverables_write" ON deliverables FOR ALL
  USING (is_admin());

-- ============================================================
-- CLIENT_DELIVERABLES
-- ============================================================
CREATE POLICY "client_deliverables_select" ON client_deliverables FOR SELECT
  USING (
    is_admin_or_gestor()
    OR has_client_access(client_id)
  );

CREATE POLICY "client_deliverables_write" ON client_deliverables FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- CONTRACTS (somente admin/gestor)
-- ============================================================
CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (is_admin_or_gestor());

CREATE POLICY "contracts_write" ON contracts FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- TASKS
-- ============================================================
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (
    is_admin_or_gestor()
    OR (
      -- colaborador: precisa de acesso ao cliente E ao pilar
      has_client_access(client_id)
      AND (
        pillar_id IS NULL
        OR EXISTS (
          SELECT 1 FROM member_services
          WHERE colaborador_id = auth.uid() AND pilar_id = tasks.pillar_id
        )
      )
    )
  );

CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (is_admin_or_gestor() OR has_client_access(client_id));

CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (is_admin_or_gestor() OR has_client_access(client_id));

CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (is_admin_or_gestor());

-- ============================================================
-- ONBOARDING_STEPS
-- ============================================================
CREATE POLICY "onboarding_steps_select" ON onboarding_steps FOR SELECT
  USING (TRUE);

CREATE POLICY "onboarding_steps_write" ON onboarding_steps FOR ALL
  USING (is_admin());

-- ============================================================
-- CLIENT_ONBOARDING
-- ============================================================
CREATE POLICY "client_onboarding_select" ON client_onboarding FOR SELECT
  USING (is_admin_or_gestor() OR has_client_access(client_id));

CREATE POLICY "client_onboarding_write" ON client_onboarding FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- INTEGRATIONS (somente admin/gestor — tokens sensíveis)
-- ============================================================
CREATE POLICY "integrations_select" ON integrations FOR SELECT
  USING (is_admin_or_gestor());

CREATE POLICY "integrations_write" ON integrations FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- METRICS_DAILY
-- ============================================================
CREATE POLICY "metrics_select" ON metrics_daily FOR SELECT
  USING (
    is_admin_or_gestor()
    OR has_client_access(client_id)
    -- cliente vê as próprias métricas
    OR client_id IN (
      SELECT ca.client_id FROM client_assignments ca
      JOIN profiles p ON p.id = ca.colaborador_id
      WHERE p.id = auth.uid() AND p.role = 'cliente'
    )
  );

CREATE POLICY "metrics_write" ON metrics_daily FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- REPORTS
-- ============================================================
CREATE POLICY "reports_select" ON reports FOR SELECT
  USING (
    is_admin_or_gestor()
    OR has_client_access(client_id)
    -- cliente vê somente relatórios publicados da própria empresa
    OR (
      status = 'publicado'
      AND client_id IN (
        SELECT ca.client_id FROM client_assignments ca
        JOIN profiles p ON p.id = ca.colaborador_id
        WHERE p.id = auth.uid() AND p.role = 'cliente'
      )
    )
  );

CREATE POLICY "reports_write" ON reports FOR ALL
  USING (is_admin_or_gestor());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (is_admin_or_gestor());

-- ============================================================
-- AUDIT_LOG (somente admin)
-- ============================================================
CREATE POLICY "audit_select" ON audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "audit_insert" ON audit_log FOR INSERT
  WITH CHECK (TRUE); -- inserção via service role no backend
