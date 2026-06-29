'use client'

import { useState } from 'react'
import { PROVIDERS, getProvider } from '@/lib/integrations/providers'
import { Provider } from '@/lib/integrations/types'

import {
  Plug, RefreshCw, Loader2, Check, X, AlertTriangle,
  ExternalLink, Plus, ChevronDown, Pencil, Trash2,
  Calendar, Clock, Wifi, WifiOff, BarChart2
} from 'lucide-react'
import { ManualMetricsForm } from './ManualMetricsForm'
import { useRouter } from 'next/navigation'

interface Integration {
  id: string
  client_id: string
  provider: Provider
  status: 'ativo' | 'erro' | 'desconectado'
  last_sync_at: string | null
  config?: Record<string, string>
}

interface Cliente {
  id: string
  nome_empresa: string
  plataforma?: string
}

interface Props {
  clientes: Cliente[]
  integracoes: Integration[]
}

const STATUS_CONFIG = {
  ativo:        { label: 'Conectado',    color: '#34D399', badge: 'badge-green', Icon: Wifi },
  erro:         { label: 'Erro',          color: '#F87171', badge: 'badge-red',   Icon: WifiOff },
  desconectado: { label: 'Desconectado', color: 'var(--lilac)', badge: 'badge-gray', Icon: WifiOff },
}

// ── Modal de conexão ──────────────────────────────────────────
function ConectarModal({
  cliente,
  existingProviders,
  onClose,
  onSaved,
}: {
  cliente: Cliente
  existingProviders: Provider[]
  onClose: () => void
  onSaved: () => void
}) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [extraConfig, setExtraConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const provider = selectedProvider ? getProvider(selectedProvider) : null
  const availableProviders = PROVIDERS.filter(p => !existingProviders.includes(p.id))

  async function handleConnect() {
    if (!selectedProvider) return
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: cliente.id,
          provider: selectedProvider,
          extraConfig,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao conectar.' })
      } else if (data.oauthUrl) {
        window.open(data.oauthUrl, '_blank', 'width=600,height=700')
        setMessage({ type: 'success', text: 'Janela de autorização aberta. Após autorizar, feche e atualize a página.' })
      } else {
        onSaved()
      }
    } catch {
      setMessage({ type: 'error', text: 'Serviço de integrações indisponível. Configure o Supabase para usar esta função.' })
    }
    setLoading(false)
  }


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="glass animate-fade-in-up" style={{ width: '100%', maxWidth: 520, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--cream)', letterSpacing: '0.02em' }}>
              Conectar Integração
            </h2>
            <p style={{ fontSize: 13, color: 'var(--lilac)', marginTop: 2 }}>
              {cliente.nome_empresa}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><X size={18} /></button>
        </div>

        {/* Seleção de provedor */}
        {!selectedProvider ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--lilac)', marginBottom: 4 }}>Escolha o provedor:</p>
            {availableProviders.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--lilac)', textAlign: 'center', padding: '20px 0' }}>
                Todos os provedores já estão conectados para este cliente.
              </p>
            ) : (
              availableProviders.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className="glass glass-hover"
                  style={{
                    width: '100%', padding: '14px 16px', border: '1px solid var(--border-subtle)',
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: 'none',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)', marginBottom: 2 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--lilac)' }}>{p.description}</div>
                  </div>
                  <div style={{
                    marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-data)',
                    padding: '3px 8px', borderRadius: 99,
                    background: p.requiresOAuth ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)',
                    color: p.requiresOAuth ? 'var(--violet-2)' : '#34D399',
                    fontWeight: 600, letterSpacing: '0.04em',
                  }}>
                    {p.requiresOAuth ? 'OAuth' : 'Token'}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div>
            {/* Header do provedor selecionado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 20 }}>
              <span style={{ fontSize: 22 }}>{provider!.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>{provider!.label}</div>
                <div style={{ fontSize: 12, color: 'var(--lilac)' }}>{provider!.description}</div>
              </div>
              <button onClick={() => { setSelectedProvider(null); setExtraConfig({}) }} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: 4, fontSize: 11 }}>
                Trocar
              </button>
            </div>

            {/* Campos de configuração */}
            {provider!.fields.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {provider!.fields.map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>
                      {f.label} {f.required && '*'}
                    </label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={extraConfig[f.key] || ''}
                      onChange={e => setExtraConfig(p => ({ ...p, [f.key]: e.target.value }))}
                      className="input-vettor"
                    />
                    {f.hint && <p style={{ fontSize: 11, color: 'rgba(174,150,214,0.6)', marginTop: 4 }}>{f.hint}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Instruções OAuth */}
            {provider!.requiresOAuth && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: 'var(--lilac)' }}>
                    Ao clicar em Conectar, uma janela será aberta para você autorizar o acesso. Certifique-se de que popups estão permitidos para este site.
                  </p>
                </div>
              </div>
            )}

            {message && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                color: message.type === 'error' ? '#F87171' : '#34D399',
                fontSize: 13,
              }}>
                {message.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleConnect} disabled={loading} className="btn btn-primary">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />}
                {provider!.requiresOAuth ? 'Autorizar via OAuth' : 'Conectar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card de cliente com suas integrações ──────────────────────
function ClienteIntegrationCard({
  cliente,
  integracoes,
  onRefresh,
}: {
  cliente: Cliente
  integracoes: Integration[]
  onRefresh: () => void
}) {
  const [showConectar, setShowConectar] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()

  const connectedProviders = integracoes.map(i => i.provider)
  const activeCount = integracoes.filter(i => i.status === 'ativo').length

  async function handleSync(integrationId: string, clientId: string) {
    setSyncing(integrationId)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const ago30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
      await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, clientId, dateStart: ago30, dateEnd: today }),
      })
    } catch { /* offline */ }
    setSyncing(null)
    router.refresh()
  }

  async function handleDisconnect(integrationId: string) {
    if (!confirm('Desconectar esta integração? As métricas já sincronizadas serão mantidas.')) return
    try {
      await fetch(`/api/integrations/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      })
    } catch { /* offline */ }
    router.refresh()
  }

  return (
    <>
      <div className="glass" style={{ overflow: 'hidden' }}>
        {/* Header do cliente */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
          cursor: 'pointer',
        }} onClick={() => setExpanded(!expanded)}>
          <div style={{
            width: 40, height: 40, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-title)', fontSize: 18, color: 'white', flexShrink: 0,
          }}>
            {cliente.nome_empresa.slice(0, 1)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 3 }}>
              {cliente.nome_empresa}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {integracoes.length === 0 ? (
                <span className="badge badge-gray" style={{ fontSize: 10 }}>Sem integrações</span>
              ) : (
                integracoes.map(i => {
                  const p = getProvider(i.provider)
                  const s = STATUS_CONFIG[i.status]
                  return (
                    <span key={i.id} className={`badge ${s.badge}`} style={{ fontSize: 10, gap: 4 }}>
                      {p?.icon} {p?.label}
                    </span>
                  )
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {integracoes.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--lilac)' }}>
                {activeCount}/{integracoes.length} ativas
              </span>
            )}
            <ChevronDown size={16} style={{ color: 'var(--lilac)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        </div>

        {/* Corpo expandido */}
        {expanded && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Lista de integrações */}
            {integracoes.map(integ => {
              const provider = getProvider(integ.provider)
              const statusCfg = STATUS_CONFIG[integ.status]
              const StatusIcon = statusCfg.Icon
              const isSyncing = syncing === integ.id

              return (
                <div key={integ.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 8,
                  background: 'rgba(19,8,35,0.5)', border: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{provider?.icon}</span>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>
                        {provider?.label}
                      </span>
                      <span className={`badge ${statusCfg.badge}`} style={{ gap: 4, fontSize: 10 }}>
                        <StatusIcon size={9} /> {statusCfg.label}
                      </span>
                    </div>
                    {integ.last_sync_at ? (
                      <div style={{ fontSize: 11, color: 'var(--lilac)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} />
                        Última sync: {new Date(integ.last_sync_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'rgba(174,150,214,0.5)' }}>Nenhuma sync realizada</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleSync(integ.id, cliente.id)}
                      disabled={isSyncing}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 5 }}
                      title="Sincronizar agora (últimos 30 dias)"
                    >
                      {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Sync
                    </button>
                    <button
                      onClick={() => handleDisconnect(integ.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 7, color: '#F87171' }}
                      title="Desconectar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowConectar(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: 6, borderStyle: 'dashed' }}
              >
                <Plus size={13} /> Adicionar integração
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="btn btn-ghost btn-sm"
                style={{ gap: 6 }}
              >
                <Pencil size={13} /> Entrada manual
              </button>
            </div>
          </div>
        )}
      </div>

      {showConectar && (
        <ConectarModal
          cliente={cliente}
          existingProviders={connectedProviders}
          onClose={() => setShowConectar(false)}
          onSaved={() => { setShowConectar(false); onRefresh() }}
        />
      )}

      {showManual && (
        <ManualMetricsForm
          clientId={cliente.id}
          clientName={cliente.nome_empresa}
          onClose={() => setShowManual(false)}
          onSaved={() => { setShowManual(false); onRefresh() }}
        />
      )}
    </>
  )
}

// ── Componente principal ──────────────────────────────────────
export function IntegracoesClient({ clientes, integracoes }: Props) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  function refresh() { router.refresh() }

  const filtered = clientes.filter(c =>
    !search || c.nome_empresa.toLowerCase().includes(search.toLowerCase())
  )

  const totalAtivas = integracoes.filter(i => i.status === 'ativo').length
  const totalErros  = integracoes.filter(i => i.status === 'erro').length

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Plug size={22} style={{ color: 'var(--violet-2)' }} />
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)' }}>
            Integrações
          </h1>
        </div>
        <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
          Conecte cada cliente às suas plataformas de dados. As métricas são sincronizadas automaticamente todo dia às 06h.
        </p>
      </div>

      {/* Stats */}
      <div className="animate-fade-in-up delay-100" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Clientes',           value: clientes.length,     color: 'var(--lilac)' },
          { label: 'Integrações ativas', value: totalAtivas,         color: '#34D399' },
          { label: 'Com erro',           value: totalErros,          color: '#F87171' },
          { label: 'Provedores',         value: PROVIDERS.length,    color: 'var(--violet-2)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontFamily: 'var(--font-data)', fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--lilac)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Provedores disponíveis */}
      <div className="glass animate-fade-in-up delay-100" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lilac)', marginBottom: 12 }}>
          Provedores disponíveis
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PROVIDERS.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 99,
              background: 'rgba(19,8,35,0.6)',
              border: '1px solid var(--border-subtle)',
            }}>
              <span>{p.icon}</span>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--cream)' }}>{p.label}</span>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 99,
                background: p.requiresOAuth ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.15)',
                color: p.requiresOAuth ? 'var(--violet-2)' : '#34D399',
                fontFamily: 'var(--font-data)', fontWeight: 600,
              }}>
                {p.requiresOAuth ? 'OAuth 2.0' : 'Token'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Busca */}
      <div className="glass animate-fade-in-up delay-200" style={{ padding: '12px 14px', marginBottom: 14 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="input-vettor"
          style={{ height: 38, fontSize: 13 }}
        />
      </div>

      {/* Lista por cliente */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(cliente => (
          <div key={cliente.id} className="animate-fade-in-up">
            <ClienteIntegrationCard
              cliente={cliente}
              integracoes={integracoes.filter(i => i.client_id === cliente.id)}
              onRefresh={refresh}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="glass" style={{ padding: '40px 32px', textAlign: 'center', color: 'var(--lilac)' }}>
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  )
}
