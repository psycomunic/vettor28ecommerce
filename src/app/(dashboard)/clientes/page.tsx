'use client'

import { useState, useTransition } from 'react'
import { useClientes } from '@/hooks/useClientes'
import { ClienteCard } from '@/components/clientes/ClienteCard'
import { ClienteForm } from '@/components/clientes/ClienteForm'
import { Plus, Search, SlidersHorizontal, Briefcase, Loader2 } from 'lucide-react'

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [, startTransition] = useTransition()

  const { clientes, loading, refetch } = useClientes(debouncedSearch)

  function handleSearch(val: string) {
    setSearch(val)
    // Debounce simples
    setTimeout(() => {
      startTransition(() => setDebouncedSearch(val))
    }, 300)
  }

  return (
    <div>
      {/* Cabeçalho da página */}
      <div className="animate-fade-in-up" style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-title)',
            fontSize: 28,
            letterSpacing: '0.02em',
            color: 'var(--cream)',
            marginBottom: 4,
          }}>
            Clientes
          </h1>
          <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
            {loading ? '...' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} encontrado${clientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <button
          id="btn-novo-cliente"
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus size={17} />
          Novo Cliente
        </button>
      </div>

      {/* Barra de busca e filtros */}
      <div className="glass animate-fade-in-up delay-100" style={{
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        marginBottom: 20,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
          <input
            id="busca-clientes"
            type="text"
            placeholder="Buscar por nome da empresa..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-vettor"
            style={{ paddingLeft: 36, height: 40 }}
          />
        </div>
        <button className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
          <SlidersHorizontal size={14} />
          Filtros
        </button>
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: 'var(--lilac)' }}>
          <Loader2 size={22} className="animate-spin" />
          <span>Carregando clientes...</span>
        </div>
      ) : clientes.length === 0 ? (
        <div className="glass" style={{
          textAlign: 'center',
          padding: '64px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(124,58,237,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={28} style={{ color: 'var(--violet-2)', opacity: 0.6 }} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 16, fontWeight: 600, color: 'var(--cream)', marginBottom: 8 }}>
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--lilac)', maxWidth: 340 }}>
              {search
                ? 'Tente uma busca diferente ou limpe os filtros.'
                : 'Comece adicionando o primeiro cliente da VETTOR 28.'}
            </p>
          </div>
          {!search && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              Adicionar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {clientes.map((cliente, i) => (
            <div key={cliente.id} className={`animate-fade-in-up delay-${Math.min((i % 5 + 1) * 100, 300) as 100 | 200 | 300}`}>
              <ClienteCard cliente={cliente} onUpdated={refetch} />
            </div>
          ))}
        </div>
      )}

      {/* Modal de novo cliente */}
      {showForm && (
        <ClienteForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch() }}
        />
      )}
    </div>
  )
}
