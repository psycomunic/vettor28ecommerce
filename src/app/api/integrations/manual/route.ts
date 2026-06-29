import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/integrations/manual
 * Salva métricas inseridas manualmente pelo usuário.
 *
 * Body: { clientId, date, metrics: NormalizedMetrics }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { clientId, date, metrics } = await request.json()

  if (!clientId || !date) {
    return NextResponse.json({ error: 'clientId e date são obrigatórios.' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()

  // Upsert com um integration_id de manual (null é aceito no schema)
  const { error } = await adminSupabase.from('metrics_daily').upsert({
    client_id: clientId,
    date,
    provider: 'manual',
    integration_id: null,
    spend: metrics.spend ?? null,
    impressions: metrics.impressions ?? null,
    clicks: metrics.clicks ?? null,
    ctr: metrics.ctr ?? null,
    cpm: metrics.cpm ?? null,
    cpc: metrics.cpc ?? null,
    reach: metrics.reach ?? null,
    purchases: metrics.purchases ?? null,
    purchase_value: metrics.purchase_value ?? null,
    roas: metrics.roas ?? null,
    cac: metrics.cac ?? null,
    sessions: metrics.sessions ?? null,
    users: metrics.users ?? null,
    new_users: metrics.new_users ?? null,
    orders: metrics.orders ?? null,
    revenue: metrics.revenue ?? null,
    avg_ticket: metrics.avg_ticket ?? null,
  }, { onConflict: 'client_id,date,provider' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'metrics.manual_entry',
    entity: 'metrics_daily',
    payload: { client_id: clientId, date },
  })

  return NextResponse.json({ success: true })
}
