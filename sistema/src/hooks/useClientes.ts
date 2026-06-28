'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'
import type { Client } from '@/types/database'

/**
 * Hook para buscar e gerenciar clientes via Supabase.
 */
export function useClientes(search?: string) {
  const [clientes, setClientes] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('clients')
        .select('*, responsavel:profiles(id, nome, email, avatar_url), plano:plans(id, nome)')
        .order('created_at', { ascending: false })

      if (search && search.trim()) {
        query = query.ilike('nome_empresa', `%${search.trim()}%`)
      }

      const { data, error: err } = await query

      if (err) {
        setError(err.message)
      } else {
        setClientes(data as Client[])
        setError(null)
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  return { clientes, loading, error, refetch: fetchClientes }
}

/**
 * Hook para buscar um único cliente por ID.
 */
export function useCliente(id: string) {
  const [cliente, setCliente] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCliente() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('clients')
          .select(`
            *,
            responsavel:profiles(id, nome, email, avatar_url),
            plano:plans(id, nome)
          `)
          .eq('id', id)
          .single()

        setCliente(data as Client)
      } catch {
        setCliente(null)
      }
      setLoading(false)
    }

    if (id) fetchCliente()
  }, [id])

  return { cliente, loading }
}
