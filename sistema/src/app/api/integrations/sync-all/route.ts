import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/integrations/sync-all
 * Cron job: sincroniza todas as integrações ativas de todos os clientes.
 *
 * Configurar no Vercel:
 * vercel.json → crons: [{ path: '/api/integrations/sync-all', schedule: '0 6 * * *' }]
 *
 * Protegido por CRON_SECRET para evitar chamadas não autorizadas.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Verifica o secret do cron
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const { data: integracoes } = await supabase
    .from('integrations')
    .select('id, client_id')
    .eq('status', 'ativo')

  if (!integracoes?.length) {
    return NextResponse.json({ message: 'Nenhuma integração ativa.' })
  }

  // Dispara sync para cada integração
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const uniqueClients = [...new Set(integracoes.map(i => i.client_id))]
  const results = await Promise.allSettled(
    uniqueClients.map(clientId =>
      fetch(`${appUrl}/api/integrations/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret || ''}`,
        },
        body: JSON.stringify({
          clientId,
          dateStart: thirtyDaysAgo,
          dateEnd: today,
        }),
      })
    )
  )

  const summary = results.map((r, i) => ({
    clientId: uniqueClients[i],
    status: r.status,
  }))

  return NextResponse.json({ synced: summary.length, summary })
}
