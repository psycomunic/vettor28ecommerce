import { NormalizedMetrics } from './types'
import { decryptJSON } from './encrypt'

/**
 * Adapter para Google Ads.
 *
 * Requer:
 * - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (OAuth 2.0)
 * - GOOGLE_ADS_DEVELOPER_TOKEN (aprovado pelo Google)
 *
 * Fluxo OAuth:
 * 1. /api/integrations/google/connect → redireciona para Google OAuth
 * 2. Google redireciona para /api/integrations/google/callback com code
 * 3. Troca code por access_token + refresh_token
 * 4. Armazena refresh_token criptografado + customer_id
 */

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v15'

export function getGoogleOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`,
    scope: [
      'https://www.googleapis.com/auth/adwords',
      'openid', 'email',
    ].join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_OAUTH_BASE}?${params}`
}

export async function exchangeGoogleCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

export async function syncGoogleAds(
  encryptedCreds: string,
  clientId: string,
  integrationId: string,
  dateStart: string,
  dateEnd: string
): Promise<NormalizedMetrics[]> {
  const creds = decryptJSON<{ refresh_token: string; customer_id: string }>(encryptedCreds)
  const access_token = await refreshGoogleToken(creds.refresh_token)
  const customerId = creds.customer_id.replace(/-/g, '')

  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpm,
      metrics.average_cpc,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
    ORDER BY segments.date ASC
  `

  const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'Erro ao buscar Google Ads')

  // Agrupa por data (soma de todas as campanhas)
  const byDate: Record<string, NormalizedMetrics> = {}
  const rows = json.results || []

  for (const row of rows) {
    const date = row.segments.date
    const spend = (row.metrics.cost_micros || 0) / 1_000_000
    const purchases = row.metrics.conversions || 0
    const purchaseValue = row.metrics.conversions_value || 0

    if (!byDate[date]) {
      byDate[date] = {
        date, client_id: clientId, integration_id: integrationId, provider: 'google_ads',
        spend: 0, impressions: 0, clicks: 0, ctr: 0, cpm: 0, cpc: 0,
        purchases: 0, purchase_value: 0, roas: 0, cac: 0,
      }
    }

    const d = byDate[date]
    d.spend = (d.spend || 0) + spend
    d.impressions = (d.impressions || 0) + (row.metrics.impressions || 0)
    d.clicks = (d.clicks || 0) + (row.metrics.clicks || 0)
    d.purchases = (d.purchases || 0) + purchases
    d.purchase_value = (d.purchase_value || 0) + purchaseValue
  }

  return Object.values(byDate).map(d => ({
    ...d,
    ctr: d.impressions! > 0 ? (d.clicks! / d.impressions!) * 100 : 0,
    roas: d.spend! > 0 ? d.purchase_value! / d.spend! : 0,
    cac: d.purchases! > 0 ? d.spend! / d.purchases! : 0,
  }))
}
