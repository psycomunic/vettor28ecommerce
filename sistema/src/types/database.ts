// Tipos TypeScript gerados a partir do schema do Supabase (Fase 1)
// Atualize com: npx supabase gen types typescript --project-id SEU_PROJECT_ID

export type UserRole = 'admin' | 'gestor' | 'colaborador' | 'cliente'
export type OnboardingStatus = 'pendente' | 'em_andamento' | 'concluido'
export type ContractStatus = 'ativo' | 'pausado' | 'encerrado'
export type TaskStatus = 'a_fazer' | 'fazendo' | 'revisao' | 'concluido'
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente'
export type ProviderType = 'google_ads' | 'ga4' | 'meta_ads' | 'magazord' | 'manual'
export type ReportStatus = 'rascunho' | 'revisao' | 'publicado'

export interface Profile {
  id: string
  nome: string
  email: string
  role: UserRole
  avatar_url: string | null
  status: string
  created_at: string
}

export interface Plan {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  created_at: string
}

export interface Client {
  id: string
  nome_empresa: string
  cnpj: string | null
  segmento: string | null
  plataforma: string | null
  responsavel_id: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_whatsapp: string | null
  status_onboarding: OnboardingStatus
  plano_id: string | null
  ativo: boolean
  created_at: string
  // Joins opcionais
  responsavel?: Profile
  plano?: Plan
}

export interface ClientAssignment {
  id: string
  colaborador_id: string
  client_id: string
  created_at: string
}

export interface Pillar {
  id: string
  nome: string
  slug: string
  icone: string | null
  ordem: number
  created_at: string
}

export interface Deliverable {
  id: string
  pillar_id: string
  nome: string
  descricao: string | null
  ordem: number
  created_at: string
  pillar?: Pillar
}

export interface ClientDeliverable {
  id: string
  client_id: string
  deliverable_id: string
  ativo: boolean
  created_at: string
  deliverable?: Deliverable
}

export interface Contract {
  id: string
  client_id: string
  plan_id: string | null
  inicio: string | null
  vigencia: string | null
  status: ContractStatus
  valor_mensal: number | null
  arquivo_url: string | null
  created_at: string
  plano?: Plan
}

export interface Task {
  id: string
  client_id: string
  pillar_id: string | null
  titulo: string
  descricao: string | null
  responsavel_id: string | null
  status: TaskStatus
  prioridade: TaskPriority
  prazo: string | null
  created_at: string
  responsavel?: Profile
  pillar?: Pillar
}

export interface OnboardingStep {
  id: string
  nome: string
  descricao: string | null
  ordem: number
  created_at: string
}

export interface ClientOnboarding {
  id: string
  client_id: string
  step_id: string
  status: OnboardingStatus
  responsavel_id: string | null
  data: string | null
  observacao: string | null
  created_at: string
  step?: OnboardingStep
  responsavel?: Profile
}

export interface Integration {
  id: string
  client_id: string
  provider: ProviderType
  status: string
  account_id: string | null
  last_sync: string | null
  created_at: string
}

export interface MetricDaily {
  id: string
  client_id: string
  provider: ProviderType
  date: string
  metric_key: string
  metric_value: number | null
  created_at: string
}

export interface Report {
  id: string
  client_id: string
  periodo: string
  status: ReportStatus
  resumo: string | null
  comentarios: string | null
  proximos_passos: string | null
  pdf_url: string | null
  published_at: string | null
  created_by: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  tipo: string
  mensagem: string
  link: string | null
  lida: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity: string | null
  entity_id: string | null
  payload: Record<string, unknown> | null
  ip: string | null
  created_at: string
  actor?: Profile
}
