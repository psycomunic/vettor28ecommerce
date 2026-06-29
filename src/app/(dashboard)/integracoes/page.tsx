export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntegracoesClient } from '@/components/integracoes/IntegracoesClient'

export default async function IntegracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'gestor'].includes(profile.role)) redirect('/')

  const { data: clientes } = await supabase.from('clients').select('id, nome_empresa, plataforma').eq('ativo', true).order('nome_empresa')
  const { data: integracoes } = await supabase.from('integrations').select('*').order('created_at', { ascending: false })

  return (
    <IntegracoesClient
      clientes={(clientes as any[]) || []}
      integracoes={(integracoes as any[]) || []}
    />
  )
}
