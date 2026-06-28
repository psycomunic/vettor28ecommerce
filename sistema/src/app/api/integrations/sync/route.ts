import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { syncMetaAds } from '@/lib/integrations/meta'
import { syncGoogleAds } from '@/lib/integrations/google-ads'
import { syncGA4 } from '@/lib/integrations/ga4'
import { syncMagazord } from '@/lib/integrations/magazord'
import { NormalizedMetrics, Provider } from '@/lib/integrations/types'

/**
 * POST /api/integrations/sync
 * Dispara a sincronização de uma integração específica ou de todas de um cliente.
 *
 * Body: { integrationId?, clientId, dateStart, dateEnd }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { integrationId, clientId, dateStart, dateEnd } = await request.json()

  if (!clientId) return NextResponse.json({ error: 'clientId obrigatório.' }, { status: 400 })

  const start = dateStart || getDateDaysAgo(30)
  const end = dateEnd || getToday()

  // Busca integração(ões)
  const query = supabase.from('integrations').select('*').eq('client_id', clientId).eq('status', 'ativo')
  if (integrationId) query.eq('id', integrationId)

  const { data: integracoes, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!integracoes?.length) return NextResponse.json({ error: 'Nenhuma integração ativa encontrada.' }, { status: 404 })

  const adminSupabase = await createAdminClient()
  const results: { provider: Provider; rows: number; error?: string }[] = []

  for (const integ of integracoes) {
    try {
      let metrics: NormalizedMetrics[] = []

      if (integ.provider === 'meta_ads') {
        metrics = await syncMetaAds(integ.credentials_enc, clientId, integ.id, start, end)
      } else if (integ.provider === 'google_ads') {
        metrics = await syncGoogleAds(integ.credentials_enc, clientId, integ.id, start, end)
      } else if (integ.provider === 'ga4') {
        metrics = await syncGA4(integ.credentials_enc, clientId, integ.id, start, end)
      } else if (integ.provider === 'magazord') {
        metrics = await syncMagazord(integ.credentials_enc, clientId, integ.id, start, end)
      }

      if (metrics.length > 0) {
        // Upsert das métricas normalizadas
        await adminSupabase.from('metrics_daily').upsert(
          metrics.map(m => ({
            client_id: m.client_id,
            integration_id: m.integration_id,
            date: m.date,
            provider: m.provider,
            spend: m.spend ?? null,
            impressions: m.impressions ?? null,
            clicks: m.clicks ?? null,
            ctr: m.ctr ?? null,
            cpm: m.cpm ?? null,
            cpc: m.cpc ?? null,
            reach: m.reach ?? null,
            purchases: m.purchases ?? null,
            purchase_value: m.purchase_value ?? null,
            roas: m.roas ?? null,
            cac: m.cac ?? null,
            sessions: m.sessions ?? null,
            users: m.users ?? null,
            new_users: m.new_users ?? null,
            bounce_rate: m.bounce_rate ?? null,
            avg_session_duration: m.avg_session_duration ?? null,
            orders: m.orders ?? null,
            revenue: m.revenue ?? null,
            avg_ticket: m.avg_ticket ?? null,
          })),
          { onConflict: 'client_id,date,provider' }
        )
      }

      // Atualiza last_sync_at
      await adminSupabase.from('integrations').update({
        last_sync_at: new Date().toISOString(),
        status: 'ativo',
      }).eq('id', integ.id)

      results.push({ provider: integ.provider, rows: metrics.length })
    } catch (err: any) {
      console.error(`[Sync ${integ.provider}]`, err)
      await adminSupabase.from('integrations').update({ status: 'erro' }).eq('id', integ.id)
      results.push({ provider: integ.provider, rows: 0, error: err.message })
    }
  }

  return NextResponse.json({ success: true, results })
}

// ── Helpers ──────────────────────────────────────────────────────
function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
