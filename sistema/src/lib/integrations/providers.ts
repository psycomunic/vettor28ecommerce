import { ProviderConfig } from './types'

/**
 * Catálogo de provedores de integração.
 * Cada provedor define seus campos de configuração e comportamento.
 */
export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'meta_ads',
    label: 'Meta Ads',
    description: 'Facebook Ads & Instagram Ads — ROAS, CAC, investimento, alcance.',
    color: '#1877F2',
    icon: '📘',
    requiresOAuth: true,
    fields: [
      {
        key: 'ad_account_id',
        label: 'ID da conta de anúncios',
        type: 'text',
        placeholder: 'act_123456789',
        required: true,
        hint: 'Encontre no Business Manager → Configurações → Contas de Anúncios',
      },
    ],
  },
  {
    id: 'google_ads',
    label: 'Google Ads',
    description: 'Campanhas de busca, Shopping, Performance Max — cliques, conversões.',
    color: '#4285F4',
    icon: '🔵',
    requiresOAuth: true,
    fields: [
      {
        key: 'customer_id',
        label: 'Customer ID',
        type: 'text',
        placeholder: '123-456-7890',
        required: true,
        hint: 'ID da conta no canto superior direito do Google Ads',
      },
    ],
  },
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    description: 'Sessões, usuários, origem do tráfego, engajamento.',
    color: '#E37400',
    icon: '📊',
    requiresOAuth: true,
    fields: [
      {
        key: 'property_id',
        label: 'Property ID (G-XXXXX)',
        type: 'text',
        placeholder: 'G-AB1CD2EF3G',
        required: true,
        hint: 'Encontre em GA4 → Admin → Configurações da propriedade',
      },
    ],
  },
  {
    id: 'magazord',
    label: 'Magazord',
    description: 'Pedidos, faturamento, ticket médio direto do ERP da loja.',
    color: '#6C3FC5',
    icon: '🛒',
    requiresOAuth: false,
    fields: [
      {
        key: 'store_url',
        label: 'URL da loja Magazord',
        type: 'text',
        placeholder: 'https://suaoja.magazord.com.br',
        required: true,
      },
      {
        key: 'api_token',
        label: 'Token de API',
        type: 'password',
        placeholder: 'Token fornecido pelo suporte Magazord',
        required: true,
        hint: 'Solicite ao suporte da Magazord: suporte@magazord.com.br',
      },
    ],
  },
  {
    id: 'manual',
    label: 'Entrada Manual',
    description: 'Cadastre métricas manualmente para qualquer período.',
    color: '#10B981',
    icon: '✏️',
    requiresOAuth: false,
    fields: [],
  },
]

export function getProvider(id: string) {
  return PROVIDERS.find(p => p.id === id)
}
