/**
 * Tipos compartilhados para o módulo de Integrações.
 */

export type Provider = 'meta_ads' | 'google_ads' | 'ga4' | 'magazord' | 'manual'

export interface ProviderConfig {
  id: Provider
  label: string
  description: string
  color: string
  icon: string
  requiresOAuth: boolean
  fields: ProviderField[]
}

export interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'number'
  placeholder: string
  required: boolean
  hint?: string
}

export interface NormalizedMetrics {
  date: string            // YYYY-MM-DD
  client_id: string
  integration_id: string
  provider: Provider

  // Tráfego pago
  spend?: number          // Investimento (R$)
  impressions?: number
  clicks?: number
  ctr?: number            // %
  cpm?: number            // R$
  cpc?: number            // R$
  reach?: number

  // Conversão
  purchases?: number
  purchase_value?: number // Receita atribuída (R$)
  roas?: number           // purchase_value / spend
  cac?: number            // spend / purchases

  // Tráfego orgânico (GA4)
  sessions?: number
  users?: number
  new_users?: number
  bounce_rate?: number    // %
  avg_session_duration?: number // segundos

  // E-commerce (Magazord)
  orders?: number
  revenue?: number
  avg_ticket?: number
}

export type OAuthState = {
  clientId: string
  provider: Provider
  redirectBack: string
}
