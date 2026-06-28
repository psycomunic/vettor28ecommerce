'use client'

import { useRef, useState } from 'react'
import {
  FileText, Download, Loader2, CheckCircle2, Circle,
  Clock, BarChart2, Package, Users, TrendingUp, DollarSign, Target
} from 'lucide-react'

interface Props {
  clientes: any[]
  metrics: any[]
  onboardingSteps: any[]
  clientOnboarding: any[]
  clientDeliverables: any[]
  deliverables: any[]
}

function sum(rows: any[], key: string) {
  return rows.reduce((acc, r) => acc + (r[key] || 0), 0)
}

function fmt(n: number | null | undefined, type: 'currency' | 'x' | 'number' = 'number'): string {
  if (n == null || isNaN(n)) return '—'
  if (type === 'currency') return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'x') return `${n.toFixed(2)}x`
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

// ── Template de relatório (renderizado em DOM, capturado em PDF) ──────
function ReportTemplate({ cliente, metrics, onboardingSteps, clientOnboarding, clientDeliverables, deliverables }: {
  cliente: any; metrics: any[]; onboardingSteps: any[];
  clientOnboarding: any[]; clientDeliverables: any[]; deliverables: any[]
}) {
  const spend    = sum(metrics, 'spend')
  const revenue  = sum(metrics, 'revenue') || sum(metrics, 'purchase_value')
  const orders   = sum(metrics, 'orders') || sum(metrics, 'purchases')
  const sessions = sum(metrics, 'sessions')
  const roas     = spend > 0 ? revenue / spend : 0
  const cac      = orders > 0 ? spend / orders : 0
  const ticket   = orders > 0 ? revenue / orders : 0

  const concluidos  = clientOnboarding.filter(o => o.status === 'concluido').length
  const progressPct = onboardingSteps.length > 0 ? Math.round((concluidos / onboardingSteps.length) * 100) : 0

  const ativosIds = new Set(clientDeliverables.filter(cd => cd.ativo).map((cd: any) => cd.deliverable_id))
  const ativos    = deliverables.filter(d => ativosIds.has(d.id))

  const mes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const baseStyle: React.CSSProperties = {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    background: '#0A0413', color: '#F3EEF8',
    padding: '40px', width: 794, minHeight: 1123,
  }

  return (
    <div style={baseStyle}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 24, borderBottom: '2px solid #7C3AED' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: '0.1em', color: '#F5A623', marginBottom: 4 }}>VETTOR 28</div>
          <div style={{ fontSize: 13, color: '#AE96D6' }}>Agência de Performance para E-commerce</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F3EEF8', marginBottom: 4 }}>{cliente.nome_empresa}</div>
          <div style={{ fontSize: 12, color: '#AE96D6' }}>Relatório de Performance — {mes}</div>
          {cliente.plano && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 4 }}>Plano {cliente.plano.nome}</div>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#AE96D6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
          📊 Resumo de Performance (últimos 90 dias)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Investimento total', value: fmt(spend, 'currency'), color: '#7C3AED' },
            { label: 'Receita atribuída', value: fmt(revenue, 'currency'), color: '#10B981' },
            { label: 'ROAS', value: fmt(roas, 'x'), color: '#F5A623' },
            { label: 'CAC', value: fmt(cac, 'currency'), color: '#0EA5E9' },
            { label: 'Pedidos / Compras', value: fmt(orders), color: '#F59E0B' },
            { label: 'Ticket médio', value: fmt(ticket, 'currency'), color: '#EC4899' },
          ].map(k => (
            <div key={k.label} style={{
              padding: '16px 18px', borderRadius: 10,
              background: 'rgba(124,58,237,0.08)',
              border: `1px solid ${k.color}30`,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#AE96D6' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding */}
      {onboardingSteps.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#AE96D6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            🗺️ Mapa de Entrega — {progressPct}% concluído ({concluidos}/{onboardingSteps.length})
          </h2>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(174,150,214,0.15)', marginBottom: 16 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${progressPct}%`, background: progressPct === 100 ? '#10B981' : '#7C3AED' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {onboardingSteps.map((step: any, idx: number) => {
              const ob = clientOnboarding.find((o: any) => o.step_id === step.id)
              const status = ob?.status || 'pendente'
              return (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 14px', borderRadius: 8,
                  background: status === 'concluido' ? 'rgba(16,185,129,0.08)' : 'rgba(19,8,35,0.5)',
                  border: `1px solid ${status === 'concluido' ? 'rgba(16,185,129,0.25)' : 'rgba(174,150,214,0.1)'}`,
                }}>
                  <span style={{ fontSize: 10, color: '#AE96D6', minWidth: 20 }}>#{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, color: status === 'concluido' ? 'rgba(243,238,248,0.5)' : '#F3EEF8', textDecoration: status === 'concluido' ? 'line-through' : 'none' }}>
                    {step.nome}
                  </span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                    background: status === 'concluido' ? 'rgba(16,185,129,0.2)' : status === 'em_andamento' ? 'rgba(245,166,35,0.2)' : 'rgba(174,150,214,0.15)',
                    color: status === 'concluido' ? '#34D399' : status === 'em_andamento' ? '#F5A623' : '#AE96D6',
                  }}>
                    {status === 'concluido' ? 'Concluído' : status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Entregáveis */}
      {ativos.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#AE96D6', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            📦 Serviços contratados ({ativos.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {ativos.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#F3EEF8' }}>{d.nome}</div>
                  {d.pillar && <div style={{ fontSize: 10, color: '#AE96D6' }}>{d.pillar.nome}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(174,150,214,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(174,150,214,0.4)' }}>
        <span>VETTOR 28 — vettor28.com.br</span>
        <span>Gerado em {new Date().toLocaleString('pt-BR', { dateStyle: 'full' })}</span>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function RelatoriosClient({ clientes, metrics, onboardingSteps, clientOnboarding, clientDeliverables, deliverables }: Props) {
  const [selectedCliente, setSelectedCliente] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const cliente = clientes.find(c => c.id === selectedCliente)
  const clientMetrics       = metrics.filter(m => m.client_id === selectedCliente)
  const clientOnboardingFilt = clientOnboarding.filter(o => o.client_id === selectedCliente)
  const clientDeliverablesF  = clientDeliverables.filter(cd => cd.client_id === selectedCliente)

  async function handleGenerate() {
    if (!reportRef.current || !cliente) return
    setGenerating(true)
    setGenerated(false)

    // Pequeno delay para garantir renderização
    await new Promise(r => setTimeout(r, 300))

    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#0A0413',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 794,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const imgData   = canvas.toDataURL('image/png')
    const pdfWidth  = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    const pageH     = pdf.internal.pageSize.getHeight()

    let yPos = 0
    while (yPos < pdfHeight) {
      if (yPos > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -yPos, pdfWidth, pdfHeight)
      yPos += pageH
    }

    const mes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    pdf.save(`VETTOR28_${cliente.nome_empresa.replace(/\s+/g, '_')}_${mes}.pdf`)

    setGenerating(false)
    setGenerated(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <FileText size={22} style={{ color: 'var(--violet-2)' }} />
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)' }}>
            Relatórios em PDF
          </h1>
        </div>
        <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
          Gere relatórios profissionais por cliente com KPIs, onboarding e entregáveis.
        </p>
      </div>

      {/* Configuração */}
      <div className="glass animate-fade-in-up delay-100" style={{ padding: '28px 32px', marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 20 }}>
          Configurar relatório
        </h3>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 6, fontFamily: 'var(--font-data)' }}>
              Cliente *
            </label>
            <select
              value={selectedCliente}
              onChange={e => { setSelectedCliente(e.target.value); setGenerated(false) }}
              className="input-vettor"
              style={{ cursor: 'pointer', height: 42 }}
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedCliente || generating}
            className="btn btn-primary"
            style={{ gap: 8, height: 42, minWidth: 180 }}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {generating ? 'Gerando PDF...' : 'Baixar Relatório PDF'}
          </button>
        </div>

        {generated && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} style={{ color: '#34D399' }} />
            <span style={{ fontSize: 13, color: '#34D399' }}>PDF gerado com sucesso! Verifique seus downloads.</span>
          </div>
        )}
      </div>

      {/* Preview resumo */}
      {cliente && (
        <div className="glass animate-fade-in-up delay-200" style={{ padding: '24px 28px', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>
            Preview — {cliente.nome_empresa}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: 'Investimento', value: (() => { const s = sum(clientMetrics, 'spend'); return fmt(s, 'currency') })(), icon: <DollarSign size={14} />, color: 'var(--violet)' },
              { label: 'Receita', value: (() => { const r = sum(clientMetrics, 'revenue') || sum(clientMetrics, 'purchase_value'); return fmt(r, 'currency') })(), icon: <TrendingUp size={14} />, color: '#10B981' },
              { label: 'ROAS', value: (() => { const s = sum(clientMetrics, 'spend'); const r = sum(clientMetrics, 'revenue') || sum(clientMetrics, 'purchase_value'); return s > 0 ? fmt(r / s, 'x') : '—' })(), icon: <Target size={14} />, color: 'var(--amber)' },
              { label: 'Onboarding', value: `${clientOnboardingFilt.filter(o => o.status === 'concluido').length}/${onboardingSteps.length} etapas`, icon: <CheckCircle2 size={14} />, color: '#34D399' },
              { label: 'Entregáveis', value: `${clientDeliverablesF.filter(cd => cd.ativo).length} ativos`, icon: <Package size={14} />, color: 'var(--lilac)' },
            ].map(k => (
              <div key={k.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(19,8,35,0.5)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: k.color }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-data)', fontWeight: 700, color: 'var(--cream)' }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--lilac)' }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template oculto para captura */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }} aria-hidden>
        {cliente && (
          <div ref={reportRef}>
            <ReportTemplate
              cliente={cliente}
              metrics={clientMetrics}
              onboardingSteps={onboardingSteps}
              clientOnboarding={clientOnboardingFilt}
              clientDeliverables={clientDeliverablesF}
              deliverables={deliverables}
            />
          </div>
        )}
      </div>
    </div>
  )
}
