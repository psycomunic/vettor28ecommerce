export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsuariosClient } from '@/components/usuarios/UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: usuarios } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  const { data: clientes } = await supabase.from('clients').select('id, nome_empresa').eq('ativo', true).order('nome_empresa')

  return (
    <UsuariosClient
      usuarios={usuarios || []}
      clientes={clientes || []}
    />
  )
}
