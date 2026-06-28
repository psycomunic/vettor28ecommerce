import { createBrowserClient } from '@supabase/ssr'

/**
 * Cria o cliente Supabase para uso no browser (componentes Client).
 * Usa as variáveis públicas NEXT_PUBLIC_*.
 */
export function createClient() {
  // Usa || em vez de ?? para tratar strings vazias (build sem .env)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder'
  return createBrowserClient(url, key)
}
