import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaOAuthUrl } from '@/lib/integrations/meta'
import { getGoogleOAuthUrl } from '@/lib/integrations/google-ads'
import { getGA4OAuthUrl } from '@/lib/integrations/ga4'
import { encryptJSON } from '@/lib/integrations/encrypt'
import { OAuthState, Provider } from '@/lib/integrations/types'

/**
 * POST /api/integrations/connect
 * Inicia o fluxo de conexão de uma integração.
 *
 * Body: { clientId, provider, extraConfig }
 *
 * Para provedores OAuth → redireciona para o provedor.
 * Para Magazord (token simples) → salva diretamente no banco.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await request.json()
  const { clientId, provider, extraConfig } = body as {
    clientId: string
    provider: Provider
    extraConfig?: Record<string, string>
  }

  if (!clientId || !provider) {
    return NextResponse.json({ error: 'clientId e provider são obrigatórios.' }, { status: 400 })
  }

  const state: OAuthState = {
    clientId,
    provider,
    redirectBack: `${process.env.NEXT_PUBLIC_APP_URL}/integracoes`,
  }
  const stateB64 = Buffer.from(JSON.stringify(state)).toString('base64url')

  // Magazord — token direto, sem OAuth
  if (provider === 'magazord' && extraConfig) {
    const encryptedCreds = encryptJSON({
      store_url: extraConfig.store_url,
      api_token: extraConfig.api_token,
    })

    const { error } = await supabase.from('integrations').upsert({
      client_id: clientId,
      provider,
      status: 'ativo',
      credentials_enc: encryptedCreds,
      config: { store_url: extraConfig.store_url },
    }, { onConflict: 'client_id,provider' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'integration.connect',
      entity: 'integrations',
      payload: { client_id: clientId, provider },
    })

    return NextResponse.json({ success: true })
  }

  // Provedores OAuth
  let oauthUrl: string
  if (provider === 'meta_ads') oauthUrl = getMetaOAuthUrl(stateB64)
  else if (provider === 'google_ads') oauthUrl = getGoogleOAuthUrl(stateB64)
  else if (provider === 'ga4') oauthUrl = getGA4OAuthUrl(stateB64)
  else return NextResponse.json({ error: 'Provider desconhecido.' }, { status: 400 })

  return NextResponse.json({ oauthUrl })
}
