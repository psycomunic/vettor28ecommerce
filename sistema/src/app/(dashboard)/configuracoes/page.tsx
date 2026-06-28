export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from '@/components/configuracoes/ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const [pilaresRes, deliverablesRes, plansRes, stepsRes] = await Promise.all([
    supabase.from('pillars').select('*').order('ordem'),
    supabase.from('deliverables').select('*, pillar:pillars(id,nome)').order('ordem'),
    supabase.from('plans').select('*').order('ordem'),
    supabase.from('onboarding_steps').select('*').order('ordem'),
  ])

  return (
    <ConfiguracoesClient
      pilares={(pilaresRes.data as any[]) || []}
      entregaveis={(deliverablesRes.data as any[]) || []}
      planos={(plansRes.data as any[]) || []}
      etapas={(stepsRes.data as any[]) || []}
    />
  )
}
