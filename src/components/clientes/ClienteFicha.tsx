'use client'

import { useState } from 'react'
import { Client, OnboardingStep, Pillar, Deliverable } from '@/types/database'
import { formatDate, ONBOARDING_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/utils'
import {
  ArrowLeft, Pencil, Building2, User, Phone, Mail,
  Hash, Calendar, Package, CheckCircle2, Circle, Clock,
  FileText, Users, Cpu, CreditCard, Upload, Check, X, Plug
} from 'lucide-react'
import Link from 'next/link'
import { ClienteForm } from './ClienteForm'
import { useRouter } from 'next/navigation'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { ResultadosClient } from '@/components/resultados/ResultadosClient'

interface Props {
  cliente: Client & { responsavel?: any; plano?: any }
  contratos?: any[]
  pilares?: Pillar[]
  deliverables?: (Deliverable & { pillar?: Pillar })[]
  clientDeliverables?: any[]
  onboardingSteps?: OnboardingStep[]
  clientOnboarding?: any[]
  equipe?: any[]
  metrics?: any[]
}

type Tab = 'visao_geral' | 'entregaveis' | 'onboarding' | 'contrato' | 'equipe' | 'integracoes' | 'resultados' | 'relatorios'

const TABS: { id: Tab; label: string }[] = [
  { id: 'visao_geral',  label: 'Visão geral' },
  { id: 'entregaveis',  label: 'Entregáveis' },
  { id: 'onboarding',   label: 'Onboarding' },
  { id: 'contrato',     label: 'Contrato' },
  { id: 'equipe',       label: 'Equipe' },
  { id: 'integracoes',  label: 'Integrações' },
  { id: 'resultados',   label: 'Resultados' },
  { id: 'relatorios',   label: 'Relatórios' },
]

const STATUS_ONBOARDING_ICON: Record<string, React.ReactNode> = {
  pendente:     <Circle size={14} style={{ color: 'var(--lilac)' }} />,
  em_andamento: <Clock size={14} style={{ color: 'var(--amber)' }} />,
  concluido:    <CheckCircle2 size={14} style={{ color: '#34D399' }} />,
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 32px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
      <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 16, fontWeight: 600, color: 'var(--cream)', marginBottom: 8 }}>
        {label} — Em breve
      </h3>
      <p style={{ fontSize: 13, color: 'var(--lilac)' }}>Disponível nas próximas fases.</p>
    </div>
  )
}

export function ClienteFicha({
  cliente, contratos = [], pilares = [], deliverables = [],
  clientDeliverables = [], onboardingSteps = [], clientOnboarding = [], equipe = [],
  metrics = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('visao_geral')
  const [showEdit, setShowEdit] = useState(false)
  const router = useRouter()

  const responsavel = (cliente as any).responsavel
  const plano = (cliente as any).plano

  // Progress do onboarding
  const concluidos = clientOnboarding.filter(o => o.status === 'concluido').length
  const progressPct = onboardingSteps.length > 0
    ? Math.round((concluidos / onboardingSteps.length) * 100)
    : 0

  async function toggleDeliverable(deliverableId: string, isAtivo: boolean) {
    const supabase = createSupabase()
    const existing = clientDeliverables.find(cd => cd.deliverable_id === deliverableId)
    if (existing) {
      await supabase.from('client_deliverables').update({ ativo: !isAtivo }).eq('id', existing.id)
    } else {
      await supabase.from('client_deliverables').insert({ client_id: cliente.id, deliverable_id: deliverableId, ativo: true })
    }
    router.refresh()
  }

  async function toggleOnboardingStatus(stepId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'pendente' ? 'em_andamento'
      : currentStatus === 'em_andamento' ? 'concluido' : 'pendente'

    const supabase = createSupabase()
    const existing = clientOnboarding.find(o => o.step_id === stepId)
    if (existing) {
      await supabase.from('client_onboarding').update({ status: nextStatus }).eq('id', existing.id)
    } else {
      await supabase.from('client_onboarding').insert({ client_id: cliente.id, step_id: stepId, status: nextStatus })
    }
    router.refresh()
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="animate-fade-in-up" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/clientes" className="btn btn-ghost btn-sm" style={{ gap: 6, padding: '6px 10px' }}>
          <ArrowLeft size={15} /> Clientes
        </Link>
        <span style={{ color: 'var(--border-strong)' }}>/</span>
        <span style={{ fontSize: 14, color: 'var(--lilac)', fontFamily: 'var(--font-data)' }}>{cliente.nome_empresa}</span>
      </div>

      {/* Header */}
      <div className="glass animate-fade-in-up" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-title)', fontSize: 28, color: 'white',
              boxShadow: '0 4px 16px rgba(124,58,237,0.35)', flexShrink: 0,
            }}>
              {cliente.nome_empresa.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 24, letterSpacing: '0.02em', color: 'var(--cream)', marginBottom: 6 }}>
                {cliente.nome_empresa}
              </h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {cliente.plataforma && <span className="badge badge-violet">{cliente.plataforma}</span>}
                {cliente.segmento && <span className="badge badge-gray">{cliente.segmento}</span>}
                {plano && <span className="badge badge-amber">{plano.nome}</span>}
                {!cliente.ativo && <span className="badge badge-red">Inativo</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <button onClick={() => setShowEdit(true)} className="btn btn-secondary" style={{ gap: 8 }}>
              <Pencil size={14} /> Editar
            </button>
            {/* Barra de progresso do onboarding */}
            {onboardingSteps.length > 0 && (
              <div style={{ width: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--lilac)' }}>Onboarding</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 700, color: progressPct === 100 ? '#34D399' : 'var(--violet-2)' }}>
                    {progressPct}%
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(174,150,214,0.15)' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${progressPct}%`,
                    background: progressPct === 100 ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, var(--violet), var(--violet-2))',
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in-up delay-100" style={{
        display: 'flex', gap: 2, background: 'rgba(19,8,35,0.8)',
        border: '1px solid var(--border-subtle)', borderRadius: 10,
        padding: 4, marginBottom: 16, overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: 'nowrap', transition: 'all 0.15s',
              background: activeTab === tab.id ? 'linear-gradient(135deg, var(--violet), var(--violet-2))' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--lilac)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      <div className="glass animate-fade-in-up delay-200" style={{ padding: '28px' }}>

        {/* VISÃO GERAL */}
        {activeTab === 'visao_geral' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lilac)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={12} /> Dados da empresa
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Razão social', value: cliente.nome_empresa, icon: <Building2 size={14} /> },
                  { label: 'CNPJ', value: cliente.cnpj, icon: <Hash size={14} /> },
                  { label: 'Segmento', value: cliente.segmento, icon: <Package size={14} /> },
                  { label: 'Plataforma', value: cliente.plataforma, icon: <Package size={14} /> },
                  { label: 'Plano', value: plano?.nome, icon: <CreditCard size={14} /> },
                  { label: 'Membro desde', value: formatDate(cliente.created_at), icon: <Calendar size={14} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(19,8,35,0.4)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--lilac)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--lilac)', marginBottom: 2, fontFamily: 'var(--font-data)' }}>{label}</div>
                      <div style={{ fontSize: 14, color: value ? 'var(--cream)' : 'rgba(174,150,214,0.4)', fontStyle: value ? 'normal' : 'italic' }}>
                        {value ?? 'Não informado'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lilac)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={12} /> Contato e responsável
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Nome do contato', value: cliente.contato_nome, icon: <User size={14} /> },
                  { label: 'E-mail', value: cliente.contato_email, icon: <Mail size={14} /> },
                  { label: 'WhatsApp', value: cliente.contato_whatsapp, icon: <Phone size={14} /> },
                  { label: 'Responsável interno', value: responsavel?.nome, icon: <User size={14} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(19,8,35,0.4)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--lilac)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--lilac)', marginBottom: 2, fontFamily: 'var(--font-data)' }}>{label}</div>
                      <div style={{ fontSize: 14, color: value ? 'var(--cream)' : 'rgba(174,150,214,0.4)', fontStyle: value ? 'normal' : 'italic' }}>
                        {value ?? 'Não informado'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ENTREGÁVEIS */}
        {activeTab === 'entregaveis' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={16} style={{ color: 'var(--violet-2)' }} />
              Entregáveis contratados
            </h3>
            {pilares.length === 0 ? (
              <p style={{ color: 'var(--lilac)', fontSize: 13 }}>Configure os pilares e entregáveis em <strong>Configurações</strong> primeiro.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pilares.map(pilar => {
                  const pilarDeliverables = deliverables.filter(d => d.pillar_id === pilar.id)
                  if (pilarDeliverables.length === 0) return null

                  return (
                    <div key={pilar.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Cpu size={13} style={{ color: 'var(--violet-2)' }} />
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>
                          {pilar.nome}
                        </span>
                        <span className="badge badge-violet" style={{ fontSize: 10 }}>
                          {pilarDeliverables.filter(d => {
                            const cd = clientDeliverables.find(c => c.deliverable_id === d.id)
                            return cd?.ativo
                          }).length}/{pilarDeliverables.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {pilarDeliverables.map(d => {
                          const cd = clientDeliverables.find(c => c.deliverable_id === d.id)
                          const isAtivo = cd?.ativo || false

                          return (
                            <div key={d.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 12px', borderRadius: 8,
                              background: isAtivo ? 'rgba(124,58,237,0.08)' : 'rgba(19,8,35,0.4)',
                              border: `1px solid ${isAtivo ? 'rgba(124,58,237,0.25)' : 'var(--border-subtle)'}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }} onClick={() => toggleDeliverable(d.id, isAtivo)}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 4,
                                background: isAtivo ? 'var(--violet)' : 'transparent',
                                border: `2px solid ${isAtivo ? 'var(--violet)' : 'rgba(174,150,214,0.3)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all 0.15s',
                              }}>
                                {isAtivo && <Check size={11} color="white" />}
                              </div>
                              <span style={{ fontSize: 13, color: isAtivo ? 'var(--cream)' : 'var(--lilac)', flex: 1 }}>{d.nome}</span>
                              {d.descricao && <span style={{ fontSize: 11, color: 'var(--lilac)', opacity: 0.6 }}>{d.descricao}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ONBOARDING */}
        {activeTab === 'onboarding' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} style={{ color: '#34D399' }} />
                Mapa de entregas — {concluidos}/{onboardingSteps.length} etapas
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 120, height: 5, borderRadius: 3, background: 'rgba(174,150,214,0.15)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--violet), var(--violet-2))' }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-data)', fontWeight: 700, color: 'var(--violet-2)' }}>{progressPct}%</span>
              </div>
            </div>

            {onboardingSteps.length === 0 ? (
              <p style={{ color: 'var(--lilac)', fontSize: 13 }}>Configure as etapas em <strong>Configurações → Etapas Onboarding</strong>.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {onboardingSteps.map((step, idx) => {
                  const ob = clientOnboarding.find(o => o.step_id === step.id)
                  const status = ob?.status || 'pendente'
                  return (
                    <div key={step.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 8,
                      background: status === 'concluido' ? 'rgba(16,185,129,0.07)' : 'rgba(19,8,35,0.4)',
                      border: `1px solid ${status === 'concluido' ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                    }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--lilac)', width: 22, textAlign: 'center' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: status === 'concluido' ? 'rgba(243,238,248,0.6)' : 'var(--cream)', textDecoration: status === 'concluido' ? 'line-through' : 'none' }}>
                        {step.nome}
                      </span>
                      <button
                        onClick={() => toggleOnboardingStatus(step.id, status)}
                        className={`badge ${status === 'concluido' ? 'badge-green' : status === 'em_andamento' ? 'badge-amber' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        {STATUS_ONBOARDING_ICON[status]}
                        {ONBOARDING_LABELS[status as keyof typeof ONBOARDING_LABELS]}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* CONTRATO */}
        {activeTab === 'contrato' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: 'var(--amber)' }} />
              Histórico de contratos
            </h3>
            {contratos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <FileText size={28} style={{ color: 'var(--lilac)', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--lilac)', fontSize: 14 }}>Nenhum contrato registrado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contratos.map(c => (
                  <div key={c.id} style={{ padding: '14px 16px', borderRadius: 8, background: 'rgba(19,8,35,0.5)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <FileText size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>
                          {c.plano?.nome || 'Sem plano'}
                        </span>
                        <span className={`badge ${c.status === 'ativo' ? 'badge-green' : c.status === 'pausado' ? 'badge-amber' : 'badge-red'}`}>
                          {CONTRACT_STATUS_LABELS[c.status as keyof typeof CONTRACT_STATUS_LABELS]}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--lilac)' }}>
                        {c.inicio ? formatDate(c.inicio) : '—'} → {c.vigencia ? formatDate(c.vigencia) : '—'}
                      </span>
                    </div>
                    {c.arquivo_url && (
                      <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                        <Upload size={13} /> Ver PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EQUIPE */}
        {activeTab === 'equipe' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} style={{ color: 'var(--violet-2)' }} />
              Equipe atribuída
            </h3>
            {equipe.length === 0 ? (
              <p style={{ color: 'var(--lilac)', fontSize: 13 }}>Nenhum colaborador atribuído. Atribua em <strong>Usuários</strong>.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {equipe.map((e: any) => {
                  const col = e.colaborador
                  return (
                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, background: 'rgba(19,8,35,0.4)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--violet), var(--violet-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {col.nome.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)' }}>{col.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--lilac)' }}>{col.email}</div>
                      </div>
                      <span className="badge badge-violet" style={{ marginLeft: 'auto', textTransform: 'capitalize' }}>{col.role}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'integracoes' && (
          <div style={{ textAlign: 'center', padding: '40px 32px' }}>
            <Plug size={28} style={{ color: 'var(--violet-2)', margin: '0 auto 12px' }} />
            <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 15, fontWeight: 600, color: 'var(--cream)', marginBottom: 8 }}>Integrações</h3>
            <p style={{ fontSize: 13, color: 'var(--lilac)', marginBottom: 16 }}>Gerencie as integrações deste cliente no módulo centralizado.</p>
            <Link href="/integracoes" className="btn btn-primary" style={{ display: 'inline-flex', gap: 8 }}>
              <Plug size={14} /> Ir para Integrações
            </Link>
          </div>
        )}
        {activeTab === 'resultados' && (
          <ResultadosClient
            clientes={[{ id: cliente.id, nome_empresa: cliente.nome_empresa }]}
            metrics={metrics}
            dateStart={new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)}
            dateEnd={new Date().toISOString().slice(0, 10)}
          />
        )}
        {activeTab === 'relatorios' && <ComingSoon label="Relatórios" />}
      </div>

      {showEdit && (
        <ClienteForm
          cliente={cliente}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); router.refresh() }}
        />
      )}
    </div>
  )
}
