export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResultadosClient } from '@/components/resultados/ResultadosClient'

export default async function ResultadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dateEnd   = new Date().toISOString().slice(0, 10)
  const dateStart = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10)

  const [clientesRes, metricsRes] = await Promise.all([
    supabase.from('clients').select('id, nome_empresa, plataforma, segmento').eq('ativo', true).order('nome_empresa'),
    supabase.from('metrics_daily').select('*').gte('date', dateStart).lte('date', dateEnd).order('date', { ascending: true }),
  ])

  return (
    <ResultadosClient
      clientes={(clientesRes.data as any[]) || []}
      metrics={(metricsRes.data as any[]) || []}
      dateStart={dateStart}
      dateEnd={dateEnd}
    />
  )
}
