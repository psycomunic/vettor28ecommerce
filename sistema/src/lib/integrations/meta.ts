import { NormalizedMetrics } from './types'
import { decryptJSON } from './encrypt'

/**
 * Adapter para Meta Ads (Facebook Marketing API v18.0).
 *
 * Fluxo OAuth:
 * 1. /api/integrations/meta/connect → redireciona para Facebook OAuth
 * 2. Facebook redireciona para /api/integrations/meta/callback com code
 * 3. Troca code por access_token de curta duração
 * 4. Troca por long-lived token (60 dias)
 * 5. Armazena token criptografado + ad_account_id no banco
 */

const META_BASE = 'https://graph.facebook.com/v18.0'

export function getMetaOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`,
    scope: 'ads_read,read_insights',
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
}

export async function exchangeMetaCode(code: string): Promise<string> {
  // Troca code por short-lived token
  const shortRes = await fetch(
    `${META_BASE}/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`)}&code=${code}`
  )
  const { access_token: shortToken } = await shortRes.json()

  // Troca por long-lived token (60 dias)
  const longRes = await fetch(
    `${META_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortToken}`
  )
  const { access_token: longToken } = await longRes.json()
  return longToken
}

export async function syncMetaAds(
  encryptedCreds: string,
  clientId: string,
  integrationId: string,
  dateStart: string,
  dateEnd: string
): Promise<NormalizedMetrics[]> {
  const creds = decryptJSON<{ access_token: string; ad_account_id: string }>(encryptedCreds)
  const { access_token, ad_account_id } = creds

  const fields = [
    'date_start', 'spend', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc', 'reach',
    'actions', 'action_values',
  ].join(',')

  const url = new URL(`${META_BASE}/${ad_account_id}/insights`)
  url.searchParams.set('access_token', access_token)
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('time_range', JSON.stringify({ since: dateStart, until: dateEnd }))
  url.searchParams.set('fields', fields)
  url.searchParams.set('level', 'account')

  const res = await fetch(url.toString())
  const json = await res.json()

  if (!res.ok || json.error) {
    throw new Error(json.error?.message || 'Erro ao buscar dados do Meta Ads')
  }

  const data = json.data || []
  return data.map((row: any) => {
    const purchases = getActionValue(row.actions, 'purchase')
    const purchaseValue = getActionValue(row.action_values, 'purchase')
    const spend = parseFloat(row.spend || '0')

    return {
      date: row.date_start,
      client_id: clientId,
      integration_id: integrationId,
      provider: 'meta_ads' as const,
      spend,
      impressions: parseInt(row.impressions || '0'),
      clicks: parseInt(row.clicks || '0'),
      ctr: parseFloat(row.ctr || '0'),
      cpm: parseFloat(row.cpm || '0'),
      cpc: parseFloat(row.cpc || '0'),
      reach: parseInt(row.reach || '0'),
      purchases,
      purchase_value: purchaseValue,
      roas: spend > 0 ? purchaseValue / spend : 0,
      cac: purchases > 0 ? spend / purchases : 0,
    } satisfies NormalizedMetrics
  })
}

function getActionValue(actions: any[], type: string): number {
  if (!actions) return 0
  const found = actions.find(a => a.action_type === type)
  return found ? parseFloat(found.value || '0') : 0
}
