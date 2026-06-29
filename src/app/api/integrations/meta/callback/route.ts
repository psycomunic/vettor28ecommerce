import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { exchangeMetaCode } from '@/lib/integrations/meta'
import { encryptJSON } from '@/lib/integrations/encrypt'
import { OAuthState } from '@/lib/integrations/types'

/**
 * GET /api/integrations/meta/callback
 * Recebe o code do OAuth do Meta e salva o token no banco.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const stateB64 = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error || !code || !stateB64) {
    return NextResponse.redirect(`${appUrl}/integracoes?error=meta_oauth_denied`)
  }

  try {
    const state = JSON.parse(Buffer.from(stateB64, 'base64url').toString()) as OAuthState
    const { clientId } = state

    const access_token = await exchangeMetaCode(code)
    const adAccountId = url.searchParams.get('ad_account_id') || ''

    const encryptedCreds = encryptJSON({ access_token, ad_account_id: adAccountId })

    const supabase = await createAdminClient()
    await supabase.from('integrations').upsert({
      client_id: clientId,
      provider: 'meta_ads',
      status: 'ativo',
      credentials_enc: encryptedCreds,
      config: {},
      last_sync_at: null,
    }, { onConflict: 'client_id,provider' })

    return NextResponse.redirect(`${appUrl}/integracoes?success=meta_connected&client=${clientId}`)
  } catch (e: any) {
    console.error('[Meta OAuth Callback]', e)
    return NextResponse.redirect(`${appUrl}/integracoes?error=meta_token_exchange`)
  }
}
