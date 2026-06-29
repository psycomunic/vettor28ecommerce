-- ============================================================
-- VETTOR 28 — Migration 003: Seed de dados iniciais
-- ============================================================

-- 4 Pilares padrão
INSERT INTO pillars (nome, slug, icone, ordem) VALUES
  ('Tecnologia',              'tecnologia',   'cpu',          1),
  ('Marketing',               'marketing',    'megaphone',    2),
  ('Gestão',                  'gestao',       'bar-chart-2',  3),
  ('Atendimento & Logística', 'atendimento',  'headphones',   4);

-- Etapas de onboarding padrão (configurável pelo admin)
INSERT INTO onboarding_steps (nome, descricao, ordem) VALUES
  ('Kick off',                        'Reunião de início e alinhamento de expectativas',      1),
  ('Diagnóstico de negócio',          'Análise completa da operação e oportunidades',         2),
  ('Plano de mídia',                  'Elaboração da estratégia de anúncios e canais',        3),
  ('Início da gestão dos anúncios',   'Ativação das campanhas e primeiros ajustes',           4),
  ('Início do trabalho de performance','Otimização técnica da loja e experiência de compra',  5),
  ('Checklist operacional',           'Validação de processos, integrações e equipe',         6),
  ('Relatório mensal',                'Primeiro relatório de resultados com o cliente',       7),
  ('Entregas contínuas',              'Ciclo regular de entregas e otimização contínua',      8);

-- Planos de exemplo (tiers — valores configuráveis pelo admin)
INSERT INTO plans (nome, descricao, ordem) VALUES
  ('Saturno',  'Plano de entrada — foco em fundação e primeiras campanhas',     1),
  ('Falcon',   'Plano intermediário — performance + gestão full service',       2),
  ('Apollo',   'Plano premium — todos os pilares + relatórios executivos',      3);

-- Nota: o usuário admin (psycomunic@gmail.com) deve ser criado via Supabase Auth Dashboard
-- ou via convite. Após criar, atualize o role via SQL:
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'psycomunic@gmail.com';
