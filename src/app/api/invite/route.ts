import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/invite
 * Convida um novo usuário por e-mail via Supabase Admin API.
 * Somente admin pode chamar esta rota.
 */
export async function POST(request: Request) {
  try {
    // Verifica se o chamador é admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }

    const { email, nome, role } = await request.json()

    if (!email || !nome || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    // Usa o cliente admin para convidar o usuário
    const adminSupabase = await createAdminClient()
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        nome,
        role,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Registra no audit log
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'user.invite',
      entity: 'profiles',
      payload: { email, nome, role },
    })

    return NextResponse.json({ success: true, userId: data.user?.id })
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
