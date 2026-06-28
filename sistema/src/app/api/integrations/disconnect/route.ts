import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/integrations/disconnect
 * Marca uma integração como desconectada (mantém métricas).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { integrationId } = await request.json()
  if (!integrationId) return NextResponse.json({ error: 'integrationId obrigatório.' }, { status: 400 })

  const { error } = await supabase
    .from('integrations')
    .update({ status: 'desconectado', credentials_enc: null })
    .eq('id', integrationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'integration.disconnect',
    entity: 'integrations',
    payload: { integration_id: integrationId },
  })

  return NextResponse.json({ success: true })
}
