'use client'

import { useState } from 'react'
import { OnboardingStep, Client } from '@/types/database'
import { ONBOARDING_LABELS } from '@/lib/utils'
import { Map, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ClientOnboarding {
  id: string
  client_id: string
  step_id: string
  status: 'pendente' | 'em_andamento' | 'concluido'
  data: string | null
  observacao: string | null
  step?: OnboardingStep
  responsavel?: { id: string; nome: string }
}

interface Props {
  clientes: (Client & { plataforma?: string; segmento?: string })[]
  steps: OnboardingStep[]
  clientOnboardings: ClientOnboarding[]
}

const STATUS_ICON = {
  pendente: <Circle size={16} style={{ color: 'var(--lilac)' }} />,
  em_andamento: <Clock size={16} style={{ color: 'var(--amber)' }} />,
  concluido: <CheckCircle2 size={16} style={{ color: '#34D399' }} />,
}

const STATUS_COLORS = {
  pendente: 'badge-gray',
  em_andamento: 'badge-amber',
  concluido: 'badge-green',
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(174,150,214,0.15)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        borderRadius: 3,
        background: value === 100
          ? 'linear-gradient(90deg, #10B981, #34D399)'
          : 'linear-gradient(90deg, var(--violet), var(--violet-2))',
        transition: 'width 0.5s ease',
      }} />
    </div>
  )
}

function ClienteOnboardingCard({ cliente, steps, onboardings }: {
  cliente: Props['clientes'][0]
  steps: OnboardingStep[]
  onboardings: ClientOnboarding[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()

  const clientOnboardings = onboardings.filter(o => o.client_id === cliente.id)
  const concluidos = clientOnboardings.filter(o => o.status === 'concluido').length
  const total = steps.length
  const progress = total > 0 ? Math.round((concluidos / total) * 100) : 0

  async function toggleStatus(stepId: string, currentStatus: string) {
    setUpdating(stepId)
    const supabase = createClient()

    const nextStatus = currentStatus === 'pendente' ? 'em_andamento'
      : currentStatus === 'em_andamento' ? 'concluido' : 'pendente'

    const existing = clientOnboardings.find(o => o.step_id === stepId)
    if (existing) {
      await supabase.from('client_onboarding').update({ status: nextStatus }).eq('id', existing.id)
    } else {
      await supabase.from('client_onboarding').insert({
        client_id: cliente.id, step_id: stepId, status: nextStatus,
      })
    }
    router.refresh()
    setUpdating(null)
  }

  return (
    <div className="glass" style={{ overflow: 'hidden' }}>
      {/* Header do card */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          textAlign: 'left',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: 9,
          background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-title)', fontSize: 18, color: 'white',
          flexShrink: 0,
        }}>
          {cliente.nome_empresa.slice(0, 1).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>
              {cliente.nome_empresa}
            </span>
            {cliente.plataforma && <span className="badge badge-violet" style={{ fontSize: 10 }}>{cliente.plataforma}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar value={progress} />
            </div>
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-data)', fontWeight: 700,
              color: progress === 100 ? '#34D399' : 'var(--violet-2)',
              minWidth: 36, textAlign: 'right',
            }}>
              {progress}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--lilac)' }}>
              {concluidos}/{total} etapas
            </span>
          </div>
        </div>

        {expanded ? <ChevronUp size={16} style={{ color: 'var(--lilac)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--lilac)', flexShrink: 0 }} />}
      </button>

      {/* Etapas expandidas */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((step, idx) => {
              const onboarding = clientOnboardings.find(o => o.step_id === step.id)
              const status = onboarding?.status || 'pendente'
              const isUpdating = updating === step.id

              return (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: status === 'concluido' ? 'rgba(16,185,129,0.06)' : 'rgba(19,8,35,0.4)',
                  border: `1px solid ${status === 'concluido' ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s',
                }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-data)', fontWeight: 700,
                    color: 'var(--lilac)', width: 20, textAlign: 'center', flexShrink: 0,
                  }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <span style={{ flex: 1, fontSize: 13, color: status === 'concluido' ? 'rgba(243,238,248,0.7)' : 'var(--cream)', textDecoration: status === 'concluido' ? 'line-through' : 'none', fontWeight: status === 'em_andamento' ? 600 : 400 }}>
                    {step.nome}
                  </span>

                  <button
                    onClick={() => toggleStatus(step.id, status)}
                    disabled={!!isUpdating}
                    className={`badge ${STATUS_COLORS[status]}`}
                    style={{ cursor: 'pointer', border: 'none', background: 'none', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {STATUS_ICON[status]}
                    {ONBOARDING_LABELS[status]}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function OnboardingClient({ clientes, steps, clientOnboardings }: Props) {
  const [search, setSearch] = useState('')

  const filtered = clientes.filter(c =>
    !search || c.nome_empresa.toLowerCase().includes(search.toLowerCase())
  )

  const totalConcluidos = clientes.filter(c => {
    const obs = clientOnboardings.filter(o => o.client_id === c.id && o.status === 'concluido')
    return obs.length === steps.length && steps.length > 0
  }).length

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Map size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)' }}>
              Mapa de Entregas
            </h1>
            <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
              {totalConcluidos} de {clientes.length} clientes com onboarding completo
            </p>
          </div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="animate-fade-in-up delay-100" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Total de clientes', value: clientes.length, color: 'var(--violet)' },
          { label: 'Onboarding completo', value: totalConcluidos, color: '#10B981' },
          { label: 'Em andamento', value: clientes.length - totalConcluidos, color: 'var(--amber)' },
          { label: 'Etapas configuradas', value: steps.length, color: 'var(--lilac)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 24, fontFamily: 'var(--font-data)', fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--lilac)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="glass animate-fade-in-up delay-200" style={{ padding: '12px 14px', marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="input-vettor"
          style={{ height: 38, fontSize: 13 }}
        />
      </div>

      {/* Lista */}
      {steps.length === 0 ? (
        <div className="glass" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <Map size={36} style={{ color: 'var(--lilac)', opacity: 0.4, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--lilac)', fontSize: 14 }}>Nenhuma etapa de onboarding configurada.</p>
          <p style={{ color: 'rgba(174,150,214,0.5)', fontSize: 13, marginTop: 6 }}>
            Acesse <strong>Configurações → Etapas de Onboarding</strong> para criar as etapas.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(cliente => (
            <div key={cliente.id} className="animate-fade-in-up">
              <ClienteOnboardingCard
                cliente={cliente}
                steps={steps}
                onboardings={clientOnboardings}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--lilac)' }}>
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
