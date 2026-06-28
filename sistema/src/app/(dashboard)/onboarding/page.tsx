export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingClient } from '@/components/onboarding/OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clientes } = await supabase.from('clients').select('id, nome_empresa, status_onboarding, plataforma, segmento').eq('ativo', true).order('nome_empresa')
  const { data: steps } = await supabase.from('onboarding_steps').select('*').order('ordem')
  const { data: clientOnboardings } = await supabase.from('client_onboarding').select('*, step:onboarding_steps(id, nome, ordem), responsavel:profiles(id, nome)')

  return (
    <OnboardingClient
      clientes={(clientes as any[]) || []}
      steps={steps || []}
      clientOnboardings={(clientOnboardings as any[]) || []}
    />
  )
}
