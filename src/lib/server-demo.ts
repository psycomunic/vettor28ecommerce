/**
 * isServerDemoMode — sempre retorna false.
 * Com o Supabase configurado em .env.local, o modo demo está desabilitado.
 */
export async function isServerDemoMode(): Promise<boolean> {
  return false
}
