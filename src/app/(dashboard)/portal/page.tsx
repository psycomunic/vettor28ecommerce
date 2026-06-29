export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortalClient } from '@/components/portal/PortalClient'

/**
 * Portal do cliente — acesso somente leitura.
 * O cliente faz login com o e-mail registrado no cadastro e
 * vê apenas os dados da sua própria empresa.
 */
export default async function PortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Busca o perfil e verifica se é papel 'cliente'
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, role, email')
    .eq('id', user.id)
    .single()

  // Admin e colaboradores não usam o portal
  if (!profile || !['cliente', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  // Busca o cliente vinculado ao e-mail do usuário
  const { data: cliente } = await supabase
    .from('clients')
    .select('*, plano:plans(id,nome,descricao)')
    .eq('contato_email', user.email)
    .eq('ativo', true)
    .single()

  if (!cliente && profile.role !== 'admin') {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-deep)', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ fontFamily: 'var(--font-data)', color: 'var(--cream)', fontSize: 18 }}>
          Nenhuma empresa vinculada ao seu e-mail.
        </h2>
        <p style={{ color: 'var(--lilac)', fontSize: 14, textAlign: 'center', maxWidth: 360 }}>
          Entre em contato com a VETTOR 28 para verificar seu acesso.
          <br />E-mail: <strong>{user.email}</strong>
        </p>
      </div>
    )
  }

  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
  const clientId  = cliente?.id

  const [metricsRes, deliverablesRes, clientDeliverablesRes, onboardingStepsRes, clientOnboardingRes, equipeRes] = await Promise.all([
    clientId ? supabase.from('metrics_daily').select('*').eq('client_id', clientId).gte('date', dateStart).lte('date', dateEnd).order('date') : Promise.resolve({ data: [] }),
    supabase.from('deliverables').select('*, pillar:pillars(id,nome)').order('ordem'),
    clientId ? supabase.from('client_deliverables').select('*').eq('client_id', clientId) : Promise.resolve({ data: [] }),
    supabase.from('onboarding_steps').select('*').order('ordem'),
    clientId ? supabase.from('client_onboarding').select('*, step:onboarding_steps(id,nome,ordem)').eq('client_id', clientId) : Promise.resolve({ data: [] }),
    clientId ? supabase.from('client_assignments').select('colaborador:profiles(id,nome,email,avatar_url)').eq('client_id', clientId) : Promise.resolve({ data: [] }),
  ])

  return (
    <PortalClient
      profile={profile as any}
      cliente={cliente as any}
      metrics={(metricsRes.data as any[]) || []}
      deliverables={(deliverablesRes.data as any[]) || []}
      clientDeliverables={(clientDeliverablesRes.data as any[]) || []}
      onboardingSteps={(onboardingStepsRes.data as any[]) || []}
      clientOnboarding={(clientOnboardingRes.data as any[]) || []}
      equipe={(equipeRes.data as any[]) || []}
      dateStart={dateStart}
      dateEnd={dateEnd}
    />
  )
}
