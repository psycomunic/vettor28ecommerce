export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, nome, email, id').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (profile.role === 'cliente') redirect('/portal')

  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)

  const [clientesRes, integracoesRes, metricsRes, tarefasRes, onboardingRes, contratosRes] = await Promise.all([
    supabase.from('clients').select('id, nome_empresa, ativo, created_at').order('created_at', { ascending: false }),
    supabase.from('integrations').select('id, client_id, provider, status, last_sync_at'),
    supabase.from('metrics_daily').select('spend, revenue, purchase_value, orders, purchases, roas').gte('date', dateStart).lte('date', dateEnd),
    supabase.from('tasks').select('id, titulo, status, prioridade').neq('status', 'concluido').limit(8),
    supabase.from('client_onboarding').select('status, client_id'),
    supabase.from('contracts').select('id, client_id, status, vigencia').eq('status', 'ativo'),
  ])

  return (
    <DashboardClient
      profile={profile as any}
      clientes={(clientesRes.data as any[]) || []}
      integracoes={(integracoesRes.data as any[]) || []}
      metrics={(metricsRes.data as any[]) || []}
      tarefas={(tarefasRes.data as any[]) || []}
      onboarding={(onboardingRes.data as any[]) || []}
      contratos={(contratosRes.data as any[]) || []}
    />
  )
}
