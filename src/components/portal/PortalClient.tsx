'use client'

import { useState, useMemo, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import {
  LayoutDashboard, CheckCircle2, Circle, Clock, Package,
  Users, TrendingUp, DollarSign, Target, ShoppingCart,
  FileText, LogOut, Download, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, BarChart2, Star
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Tipos ──────────────────────────────────────────────────
interface Props {
  profile: { id: string; nome: string; role: string; email: string }
  cliente: any
  metrics: any[]
  deliverables: any[]
  clientDeliverables: any[]
  onboardingSteps: any[]
  clientOnboarding: any[]
  equipe: any[]
  dateStart: string
  dateEnd: string
}

type PortalTab = 'dashboard' | 'entregas' | 'onboarding' | 'equipe'

// ─── Utilitários ────────────────────────────────────────────
function fmt(n: number | undefined | null, type: 'currency' | 'x' | 'number' = 'number'): string {
  if (n == null || isNaN(n)) return '—'
  if (type === 'currency') return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'x') return `${n.toFixed(2)}x`
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function sum(rows: any[], key: string): number {
  return rows.reduce((acc, r) => acc + (r[key] || 0), 0)
}

// ─── Tooltip customizado ─────────────────────────────────────
function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(20,8,40,0.98)', border: '1px solid rgba(174,150,214,0.3)', borderRadius: 10, padding: '12px 16px' }}>
      <p style={{ fontSize: 11, color: '#AE96D6', marginBottom: 8 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: 11, color: '#AE96D6' }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F3EEF8', fontFamily: 'Space Grotesk, sans-serif' }}>
            {currency ? fmt(p.value, 'currency') : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── KPI mini card ───────────────────────────────────────────
function MiniKpi({ label, value, icon, color, trend }: { label: string; value: string; icon: React.ReactNode; color: string; trend?: { pct: number; dir: 'up' | 'down' | 'flat' } }) {
  return (
    <div style={{
      padding: '18px 20px', borderRadius: 12,
      background: 'rgba(28,15,53,0.7)',
      border: '1px solid rgba(174,150,214,0.12)',
      backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {trend && (
          <span style={{ fontSize: 12, color: trend.dir === 'up' ? '#34D399' : trend.dir === 'down' ? '#F87171' : '#AE96D6', display: 'flex', alignItems: 'center', gap: 2 }}>
            {trend.dir === 'up' ? <ArrowUpRight size={13} /> : trend.dir === 'down' ? <ArrowDownRight size={13} /> : null}
            {trend.pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, color: '#F3EEF8', marginBottom: 3 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#AE96D6' }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────
export function PortalClient({
  profile, cliente, metrics, deliverables, clientDeliverables,
  onboardingSteps, clientOnboarding, equipe, dateStart, dateEnd,
}: Props) {
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard')
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [signingOut, setSigningOut] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // ── Métricas filtradas ──────────────────────────────────────
  const filteredMetrics = useMemo(() => {
    const cutoff = new Date(Date.now() - parseInt(period) * 864e5).toISOString().slice(0, 10)
    return metrics.filter(m => m.date >= cutoff)
  }, [metrics, period])

  const kpis = useMemo(() => {
    const spend         = sum(filteredMetrics, 'spend')
    const revenue       = sum(filteredMetrics, 'revenue') || sum(filteredMetrics, 'purchase_value')
    const orders        = sum(filteredMetrics, 'orders') || sum(filteredMetrics, 'purchases')
    const sessions      = sum(filteredMetrics, 'sessions')
    const roas          = spend > 0 ? revenue / spend : 0
    const ticket        = orders > 0 ? revenue / orders : 0
    return { spend, revenue, orders, sessions, roas, ticket }
  }, [filteredMetrics])

  // ── Dados para gráficos ─────────────────────────────────────
  const chartData = useMemo(() => {
    const byDay: Record<string, any> = {}
    for (const m of filteredMetrics) {
      if (!byDay[m.date]) byDay[m.date] = { date: m.date.slice(5), invest: 0, receita: 0, sessoes: 0, pedidos: 0 }
      byDay[m.date].invest   += m.spend || 0
      byDay[m.date].receita  += (m.revenue || m.purchase_value || 0)
      byDay[m.date].sessoes  += m.sessions || 0
      byDay[m.date].pedidos  += (m.orders || m.purchases || 0)
    }
    return Object.values(byDay).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }, [filteredMetrics])

  // ── Onboarding ──────────────────────────────────────────────
  const concluidos    = clientOnboarding.filter(o => o.status === 'concluido').length
  const progressPct   = onboardingSteps.length > 0 ? Math.round((concluidos / onboardingSteps.length) * 100) : 0

  // ── Entregáveis ─────────────────────────────────────────────
  const ativosIds = new Set(clientDeliverables.filter(cd => cd.ativo).map((cd: any) => cd.deliverable_id))
  const ativos    = deliverables.filter(d => ativosIds.has(d.id))

  // ── Logout ──────────────────────────────────────────────────
  async function handleLogout() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Download PDF ────────────────────────────────────────────
  async function handleDownloadPDF() {
    if (!reportRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')

    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#0A0413',
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const imgData = canvas.toDataURL('image/png')
    const pdfWidth  = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    let yPos = 0
    const pageHeight = pdf.internal.pageSize.getHeight()

    while (yPos < pdfHeight) {
      if (yPos > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -yPos, pdfWidth, pdfHeight)
      yPos += pageHeight
    }

    const mes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    pdf.save(`Relatório VETTOR 28 — ${cliente?.nome_empresa ?? 'Portal'} — ${mes}.pdf`)
  }

  const TABS: { id: PortalTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',  label: 'Dashboard',  icon: <BarChart2 size={15} /> },
    { id: 'entregas',   label: 'Entregáveis', icon: <Package size={15} /> },
    { id: 'onboarding', label: 'Onboarding',  icon: <CheckCircle2 size={15} /> },
    { id: 'equipe',     label: 'Minha equipe', icon: <Users size={15} /> },
  ]

  const STATUS_ICON: Record<string, React.ReactNode> = {
    pendente:     <Circle size={15} style={{ color: '#AE96D6' }} />,
    em_andamento: <Clock size={15} style={{ color: '#F5A623' }} />,
    concluido:    <CheckCircle2 size={15} style={{ color: '#34D399' }} />,
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-deep)' }}>

      {/* ── Top bar do portal ─────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,4,19,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(174,150,214,0.1)',
        padding: '0 32px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, letterSpacing: '0.06em', color: '#F5A623' }}>
            VETTOR 28
          </span>
          <span style={{ fontSize: 12, color: '#AE96D6', borderLeft: '1px solid rgba(174,150,214,0.3)', paddingLeft: 14 }}>
            Portal do Cliente
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleDownloadPDF} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <Download size={14} /> Baixar PDF
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk, sans-serif',
            }}>
              {profile.nome.slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: '#F3EEF8', fontFamily: 'Space Grotesk, sans-serif' }}>{profile.nome.split(' ')[0]}</span>
          </div>
          <button onClick={handleLogout} disabled={signingOut} className="btn btn-ghost btn-sm" style={{ gap: 5, color: '#F87171' }}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── Conteúdo principal ───────────────────────── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }} ref={reportRef}>

        {/* Cabeçalho empresa */}
        <div style={{
          padding: '28px 32px', borderRadius: 16, marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(10,4,19,0.8) 100%)',
          border: '1px solid rgba(124,58,237,0.25)',
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 14,
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Anton, sans-serif', fontSize: 28, color: 'white',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)', flexShrink: 0,
          }}>
            {(cliente?.nome_empresa ?? 'C').slice(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, letterSpacing: '0.04em', color: '#F3EEF8', marginBottom: 6 }}>
              {cliente?.nome_empresa ?? 'Minha empresa'}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {cliente?.plataforma && <span className="badge badge-violet">{cliente.plataforma}</span>}
              {cliente?.segmento && <span className="badge badge-gray">{cliente.segmento}</span>}
              {cliente?.plano?.nome && <span className="badge badge-amber">Plano {cliente.plano.nome}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#AE96D6', marginBottom: 6, fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Onboarding
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 120, height: 6, borderRadius: 3, background: 'rgba(174,150,214,0.15)' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${progressPct}%`, background: progressPct === 100 ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#7C3AED,#A855F7)', transition: 'width 0.5s' }} />
              </div>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 14, color: progressPct === 100 ? '#34D399' : '#A855F7' }}>
                {progressPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'rgba(19,8,35,0.8)',
          border: '1px solid rgba(174,150,214,0.1)', borderRadius: 12,
          padding: 4, marginBottom: 24, overflowX: 'auto',
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, minWidth: 110, padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
              background: activeTab === tab.id ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#AE96D6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.15s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ─────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Seletor de período */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: '#F3EEF8' }}>
                Performance dos últimos {period} dias
              </h2>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(19,8,35,0.6)', borderRadius: 8, padding: 4 }}>
                {(['7', '30', '90'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontFamily: 'Space Grotesk, sans-serif', fontSize: 12, fontWeight: period === p ? 700 : 400,
                    background: period === p ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'transparent',
                    color: period === p ? 'white' : '#AE96D6', transition: 'all 0.15s',
                  }}>{p}d</button>
                ))}
              </div>
            </div>

            {metrics.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 32px', borderRadius: 16, background: 'rgba(28,15,53,0.5)', border: '1px solid rgba(174,150,214,0.1)' }}>
                <BarChart2 size={36} style={{ color: '#AE96D6', opacity: 0.3, margin: '0 auto 14px' }} />
                <p style={{ color: '#AE96D6', fontSize: 14 }}>Os dados de performance ainda estão sendo configurados.</p>
                <p style={{ color: 'rgba(174,150,214,0.5)', fontSize: 12, marginTop: 6 }}>Em breve você verá seus resultados aqui.</p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                  <MiniKpi label="Investimento" value={fmt(kpis.spend, 'currency')} icon={<DollarSign size={17} />} color="#7C3AED" />
                  <MiniKpi label="Receita atribuída" value={fmt(kpis.revenue, 'currency')} icon={<TrendingUp size={17} />} color="#10B981" />
                  <MiniKpi label="ROAS" value={fmt(kpis.roas, 'x')} icon={<Target size={17} />} color="#F5A623" />
                  <MiniKpi label="Pedidos" value={fmt(kpis.orders)} icon={<ShoppingCart size={17} />} color="#0EA5E9" />
                  <MiniKpi label="Ticket médio" value={fmt(kpis.ticket, 'currency')} icon={<Star size={17} />} color="#EC4899" />
                  <MiniKpi label="Sessões" value={fmt(kpis.sessions)} icon={<Users size={17} />} color="#AE96D6" />
                </div>

                {/* Gráficos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div style={{ padding: '20px 22px', borderRadius: 14, background: 'rgba(28,15,53,0.7)', border: '1px solid rgba(174,150,214,0.1)' }}>
                    <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 700, color: '#F3EEF8', marginBottom: 16 }}>
                      Investimento vs Receita
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="pg1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="pg2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,150,214,0.07)" />
                        <XAxis dataKey="date" tick={{ fill: '#AE96D6', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#AE96D6', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTooltip currency />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#AE96D6' }} />
                        <Area type="monotone" dataKey="invest" name="Investimento" stroke="#7C3AED" fill="url(#pg1)" strokeWidth={2} />
                        <Area type="monotone" dataKey="receita" name="Receita" stroke="#10B981" fill="url(#pg2)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ padding: '20px 22px', borderRadius: 14, background: 'rgba(28,15,53,0.7)', border: '1px solid rgba(174,150,214,0.1)' }}>
                    <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 700, color: '#F3EEF8', marginBottom: 16 }}>
                      Sessões & Pedidos
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,150,214,0.07)" />
                        <XAxis dataKey="date" tick={{ fill: '#AE96D6', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#AE96D6', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#AE96D6' }} />
                        <Bar dataKey="sessoes" name="Sessões" fill="rgba(124,58,237,0.7)" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="pedidos" name="Pedidos" fill="rgba(245,166,35,0.8)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ENTREGÁVEIS ───────────────────────────────── */}
        {activeTab === 'entregas' && (
          <div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: '#F3EEF8', marginBottom: 20 }}>
              Serviços contratados — {ativos.length} entregáveis ativos
            </h2>
            {ativos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', borderRadius: 14, background: 'rgba(28,15,53,0.5)', border: '1px solid rgba(174,150,214,0.1)', color: '#AE96D6', fontSize: 14 }}>
                Nenhum entregável configurado ainda.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {ativos.map((d: any) => (
                  <div key={d.id} style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <CheckCircle2 size={16} style={{ color: '#34D399', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F3EEF8', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 2 }}>
                        {d.nome}
                      </div>
                      {d.pillar && (
                        <span style={{ fontSize: 11, color: '#AE96D6' }}>{d.pillar.nome}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ONBOARDING ────────────────────────────────── */}
        {activeTab === 'onboarding' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: '#F3EEF8' }}>
                Mapa de entrega — {concluidos}/{onboardingSteps.length} etapas concluídas
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 140, height: 6, borderRadius: 3, background: 'rgba(174,150,214,0.15)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${progressPct}%`, background: progressPct === 100 ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#7C3AED,#A855F7)' }} />
                </div>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: progressPct === 100 ? '#34D399' : '#A855F7', fontSize: 14 }}>{progressPct}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onboardingSteps.map((step: any, idx: number) => {
                const ob = clientOnboarding.find((o: any) => o.step_id === step.id)
                const status = ob?.status || 'pendente'
                return (
                  <div key={step.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    background: status === 'concluido' ? 'rgba(16,185,129,0.07)' : 'rgba(28,15,53,0.6)',
                    border: `1px solid ${status === 'concluido' ? 'rgba(16,185,129,0.25)' : 'rgba(174,150,214,0.1)'}`,
                  }}>
                    <span style={{ fontSize: 11, color: '#AE96D6', minWidth: 24, textAlign: 'center', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {STATUS_ICON[status]}
                    <span style={{
                      flex: 1, fontSize: 14, fontFamily: 'Space Grotesk, sans-serif',
                      color: status === 'concluido' ? 'rgba(243,238,248,0.6)' : '#F3EEF8',
                      textDecoration: status === 'concluido' ? 'line-through' : 'none',
                      fontWeight: status === 'em_andamento' ? 600 : 400,
                    }}>
                      {step.nome}
                    </span>
                    <span className={`badge ${status === 'concluido' ? 'badge-green' : status === 'em_andamento' ? 'badge-amber' : 'badge-gray'}`} style={{ fontSize: 11 }}>
                      {status === 'concluido' ? 'Concluído' : status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── EQUIPE ────────────────────────────────────── */}
        {activeTab === 'equipe' && (
          <div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 700, color: '#F3EEF8', marginBottom: 20 }}>
              Sua equipe VETTOR 28
            </h2>
            {equipe.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', borderRadius: 14, background: 'rgba(28,15,53,0.5)', border: '1px solid rgba(174,150,214,0.1)', color: '#AE96D6', fontSize: 14 }}>
                Equipe ainda sendo definida.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {equipe.map((e: any) => {
                  const col = e.colaborador
                  return (
                    <div key={col.id} style={{
                      padding: '20px', borderRadius: 14,
                      background: 'rgba(28,15,53,0.7)', border: '1px solid rgba(174,150,214,0.1)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
                    }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk, sans-serif',
                      }}>
                        {col.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 15, color: '#F3EEF8', marginBottom: 4 }}>{col.nome}</div>
                        <div style={{ fontSize: 12, color: '#AE96D6', marginBottom: 8 }}>{col.email}</div>
                        <span className="badge badge-violet" style={{ textTransform: 'capitalize' }}>{col.role}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Rodapé do relatório */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(174,150,214,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, letterSpacing: '0.06em', color: '#F5A623' }}>VETTOR 28</span>
          <span style={{ fontSize: 12, color: 'rgba(174,150,214,0.4)' }}>
            Gerado em {new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
          </span>
        </div>
      </main>
    </div>
  )
}
