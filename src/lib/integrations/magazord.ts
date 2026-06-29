import { NormalizedMetrics } from './types'
import { decryptJSON } from './encrypt'

/**
 * Adapter para Magazord ERP.
 *
 * A Magazord tem uma API REST privada. Os endpoints disponíveis variam
 * conforme o plano contratado e a versão da plataforma.
 *
 * Documentação: https://ajuda.magazord.com.br/docs/api
 *
 * Configuração:
 * - store_url: URL base da loja (ex: https://loja.magazord.com.br)
 * - api_token: Token Bearer fornecido pelo painel Magazord
 *
 * TODO: Confirmar endpoints exatos com suporte Magazord.
 *       Os endpoints abaixo são baseados na documentação pública disponível.
 */

export async function syncMagazord(
  encryptedCreds: string,
  clientId: string,
  integrationId: string,
  dateStart: string,
  dateEnd: string
): Promise<NormalizedMetrics[]> {
  const creds = decryptJSON<{ store_url: string; api_token: string }>(encryptedCreds)
  const { store_url, api_token } = creds

  // Limpa a URL base
  const base = store_url.replace(/\/$/, '')
  const headers = {
    'Authorization': `Bearer ${api_token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // Busca pedidos no período
  // Endpoint estimado — confirmar com suporte Magazord
  const ordersRes = await fetch(
    `${base}/api/v2/orders?date_from=${dateStart}&date_to=${dateEnd}&status=finalized&per_page=500`,
    { headers }
  )

  if (!ordersRes.ok) {
    throw new Error(`Erro Magazord: ${ordersRes.status} ${ordersRes.statusText}`)
  }

  const ordersData = await ordersRes.json()
  const orders = ordersData.data || ordersData.orders || ordersData || []

  if (!Array.isArray(orders)) {
    throw new Error('Resposta inesperada da API Magazord. Confirme o endpoint com o suporte.')
  }

  // Agrupa pedidos por dia
  const byDate: Record<string, { orders: number; revenue: number }> = {}

  for (const order of orders) {
    const rawDate = order.created_at || order.date || order.data_criacao || ''
    const date = rawDate.slice(0, 10) // YYYY-MM-DD
    if (!date) continue

    if (!byDate[date]) byDate[date] = { orders: 0, revenue: 0 }

    const total = parseFloat(order.total || order.valor_total || order.amount || '0')
    byDate[date].orders += 1
    byDate[date].revenue += total
  }

  return Object.entries(byDate).map(([date, d]) => ({
    date,
    client_id: clientId,
    integration_id: integrationId,
    provider: 'magazord' as const,
    orders: d.orders,
    revenue: d.revenue,
    avg_ticket: d.orders > 0 ? d.revenue / d.orders : 0,
  } satisfies NormalizedMetrics))
}

/**
 * Valida a conexão com a API Magazord.
 * Retorna true se o token é válido.
 */
export async function validateMagazordToken(storeUrl: string, token: string): Promise<boolean> {
  try {
    const base = storeUrl.replace(/\/$/, '')
    const res = await fetch(`${base}/api/v2/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}
