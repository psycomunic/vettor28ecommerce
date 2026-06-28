import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Callback OAuth / Magic Link / Convite do Supabase.
 * Supabase redireciona para cá após autenticação com code.
 * Quando é um convite aceito, marca o profile como 'ativo'.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Marca o perfil como ativo após aceitar o convite
      await supabase
        .from('profiles')
        .update({ status: 'ativo' })
        .eq('id', data.user.id)

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
