import { NormalizedMetrics } from './types'
import { decryptJSON } from './encrypt'
import { refreshGoogleToken } from './google-ads'

/**
 * Adapter para Google Analytics 4 (Data API v1beta).
 *
 * Usa os mesmos tokens OAuth do Google Ads (mesmo provider Google).
 * Requer property_id no formato G-XXXXX ou apenas o número numérico.
 */

const GA4_BASE = 'https://analyticsdata.googleapis.com/v1beta'

export function getGA4OAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/ga4/callback`,
    scope: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'openid', 'email',
    ].join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeGA4Code(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/ga4/callback`,
      grant_type: 'authorization_code',
    }),
  })
  return res.json()
}

export async function syncGA4(
  encryptedCreds: string,
  clientId: string,
  integrationId: string,
  dateStart: string,
  dateEnd: string
): Promise<NormalizedMetrics[]> {
  const creds = decryptJSON<{ refresh_token: string; property_id: string }>(encryptedCreds)
  const access_token = await refreshGoogleToken(creds.refresh_token)

  // Normaliza o property_id (remove prefixo G- se presente, pega só o numérico)
  const propId = creds.property_id.replace(/^G-/, '').replace(/^properties\//, '')

  const body = {
    dateRanges: [{ startDate: dateStart, endDate: dateEnd }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  }

  const res = await fetch(`${GA4_BASE}/properties/${propId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'Erro ao buscar dados do GA4')

  const rows = json.rows || []
  return rows.map((row: any) => {
    const dims = row.dimensionValues
    const vals = row.metricValues

    // GA4 retorna data como YYYYMMDD, converte para YYYY-MM-DD
    const rawDate = dims[0].value as string
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`

    return {
      date,
      client_id: clientId,
      integration_id: integrationId,
      provider: 'ga4' as const,
      sessions: parseInt(vals[0].value || '0'),
      users: parseInt(vals[1].value || '0'),
      new_users: parseInt(vals[2].value || '0'),
      bounce_rate: parseFloat(vals[3].value || '0') * 100,
      avg_session_duration: parseFloat(vals[4].value || '0'),
    } satisfies NormalizedMetrics
  })
}
