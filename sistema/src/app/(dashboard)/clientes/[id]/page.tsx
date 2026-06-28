export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClienteFicha } from '@/components/clientes/ClienteFicha'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientePage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)

  const [
    clienteRes, contratosRes, pilaresRes, deliverablesRes,
    clientDeliverablesRes, onboardingStepsRes, clientOnboardingRes,
    equipeRes, metricsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*, responsavel:profiles(id,nome,email,avatar_url), plano:plans(id,nome,descricao)').eq('id', id).single(),
    supabase.from('contracts').select('*, plano:plans(id,nome)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('pillars').select('*').order('ordem'),
    supabase.from('deliverables').select('*, pillar:pillars(id,nome)').order('ordem'),
    supabase.from('client_deliverables').select('*, deliverable:deliverables(id,nome,pillar_id,pillar:pillars(id,nome))').eq('client_id', id),
    supabase.from('onboarding_steps').select('*').order('ordem'),
    supabase.from('client_onboarding').select('*, step:onboarding_steps(id,nome,ordem), responsavel:profiles(id,nome)').eq('client_id', id),
    supabase.from('client_assignments').select('colaborador:profiles(id,nome,email,role,avatar_url)').eq('client_id', id),
    supabase.from('metrics_daily').select('*').eq('client_id', id).gte('date', dateStart).lte('date', dateEnd).order('date', { ascending: true }),
  ])

  if (!clienteRes.data) redirect('/clientes')

  return (
    <ClienteFicha
      cliente={clienteRes.data as any}
      contratos={(contratosRes.data as any[]) || []}
      pilares={(pilaresRes.data as any[]) || []}
      deliverables={(deliverablesRes.data as any[]) || []}
      clientDeliverables={(clientDeliverablesRes.data as any[]) || []}
      onboardingSteps={(onboardingStepsRes.data as any[]) || []}
      clientOnboarding={(clientOnboardingRes.data as any[]) || []}
      equipe={(equipeRes.data as any[]) || []}
      metrics={(metricsRes.data as any[]) || []}
    />
  )
}
