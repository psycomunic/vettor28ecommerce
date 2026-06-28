import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cria o cliente Supabase para uso no servidor (Server Components, Route Handlers, Server Actions).
 * Lê cookies para manter a sessão do usuário.
 */
export async function createClient() {
  const cookieStore = await cookies()
  // Usa || em vez de ?? para tratar strings vazias (build sem .env)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder'

  return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado de Server Component — cookies serão definidos pelo middleware
          }
        },
      },
    }
  )
}

/**
 * Cliente com service role — NUNCA expor ao browser.
 * Usa para operações administrativas (convites, audit log, sync de integrações).
 */
export async function createAdminClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.placeholder'

  return createServerClient(url, serviceKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
