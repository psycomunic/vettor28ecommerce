export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RelatoriosClient } from '@/components/relatorios/RelatoriosClient'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'gestor'].includes(profile.role)) redirect('/')

  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)

  const [clientesRes, metricsRes, onboardingStepsRes, clientOnboardingRes, clientDeliverablesRes, deliverablesRes] = await Promise.all([
    supabase.from('clients').select('id, nome_empresa, plataforma, segmento, contato_nome, contato_email, plano:plans(id,nome)').eq('ativo', true).order('nome_empresa'),
    supabase.from('metrics_daily').select('*').gte('date', dateStart).lte('date', dateEnd).order('date'),
    supabase.from('onboarding_steps').select('*').order('ordem'),
    supabase.from('client_onboarding').select('*'),
    supabase.from('client_deliverables').select('*'),
    supabase.from('deliverables').select('*, pillar:pillars(id,nome)').order('ordem'),
  ])

  return (
    <RelatoriosClient
      clientes={(clientesRes.data as any[]) || []}
      metrics={(metricsRes.data as any[]) || []}
      onboardingSteps={(onboardingStepsRes.data as any[]) || []}
      clientOnboarding={(clientOnboardingRes.data as any[]) || []}
      clientDeliverables={(clientDeliverablesRes.data as any[]) || []}
      deliverables={(deliverablesRes.data as any[]) || []}
    />
  )
}
