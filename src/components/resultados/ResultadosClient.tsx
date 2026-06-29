'use client'

import { useMemo, useRef, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, DollarSign,
  ShoppingCart, Users, BarChart2,
  Target, Calendar, Download, Loader2, FileText, ChevronDown, X,
} from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────────
interface MetricRow {
  id: string
  client_id: string
  date: string
  provider: string
  spend?: number
  impressions?: number
  clicks?: number
  ctr?: number
  purchases?: number
  purchase_value?: number
  roas?: number
  cac?: number
  sessions?: number
  users?: number
  new_users?: number
  orders?: number
  revenue?: number
  avg_ticket?: number
}

interface Cliente {
  id: string
  nome_empresa: string
  plataforma?: string
  segmento?: string
}

interface Props {
  clientes: Cliente[]
  metrics: MetricRow[]
  dateStart: string
  dateEnd: string
}

// ─── Utilitários ────────────────────────────────────────────
function fmt(n: number | undefined, type: 'currency' | 'percent' | 'number' | 'x' = 'number', decimals = 2): string {
  if (n == null || isNaN(n)) return '—'
  if (type === 'currency') return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'percent')  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  if (type === 'x')        return `${n.toFixed(2)}x`
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function sum(rows: MetricRow[], key: keyof MetricRow): number {
  return rows.reduce((acc, r) => acc + ((r[key] as number) || 0), 0)
}

function trend(current: number, previous: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
  if (!previous) return { pct: 0, dir: 'flat' }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), dir: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat' }
}

// Subtrair N dias de hoje
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// Labels de providers e cores — fora do componente para evitar TDZ
const PROVIDER_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads', google_ads: 'Google Ads', ga4: 'GA4', magazord: 'Magazord', manual: 'Manual',
}
const PIE_COLORS = ['#7C3AED', '#1877F2', '#E37400', '#6C3FC5', '#10B981']

// Agrupa métricas por dia (soma de todos os providers)
function aggregateByDay(rows: MetricRow[]): Record<string, MetricRow> {
  const byDay: Record<string, MetricRow> = {}
  for (const row of rows) {
    if (!byDay[row.date]) {
      byDay[row.date] = { ...row, id: row.date, client_id: row.client_id, date: row.date, provider: 'aggregate' }
    } else {
      const d = byDay[row.date]
      const add = (k: keyof MetricRow) => {
        if (typeof row[k] === 'number') {
          (d as any)[k] = ((d[k] as number) || 0) + (row[k] as number)
        }
      }
      ;['spend','impressions','clicks','purchases','purchase_value','sessions','users','new_users','orders','revenue'].forEach(add as any)
      if (d.spend && d.revenue) d.roas = d.revenue / d.spend
      if (d.spend && (d.orders || d.purchases)) d.cac = d.spend / ((d.orders || d.purchases || 1))
    }
  }
  return byDay
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  label, value, icon, color, sub,
  trendDir, trendPct,
}: {
  label: string; value: string; icon: React.ReactNode; color: string
  sub?: string; trendDir?: 'up' | 'down' | 'flat'; trendPct?: number
}) {
  return (
    <div className="glass" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lilac)' }}>{label}</span>
        <span style={{ color, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-data)', fontSize: 22, fontWeight: 800, color: 'var(--cream)', letterSpacing: '-0.02em' }}>{value}</div>
      {(sub || trendDir) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {trendDir && trendDir !== 'flat' && trendPct !== undefined && (
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: trendDir === 'up' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: trendDir === 'up' ? '#34D399' : '#F87171',
            }}>
              {trendDir === 'up' ? '▲' : '▼'} {trendPct.toFixed(1)}%
            </span>
          )}
          {sub && <span style={{ fontSize: 11, color: 'var(--lilac)' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Tooltip customizado ─────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: 'var(--lilac)', marginBottom: 6, fontFamily: 'var(--font-data)' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--lilac)' }}>{p.dataKey}:</span>
          <span style={{ color: 'var(--cream)', fontWeight: 700 }}>
            {formatter ? formatter(p.value) : p.value?.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Preset de períodos ───────────────────────────────────────
type PeriodPreset = 'hoje' | '7' | '14' | '30' | '60' | '90' | '180' | 'ano' | 'custom'

interface PeriodOption {
  key: PeriodPreset
  label: string
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7',    label: '7 dias' },
  { key: '14',   label: '14 dias' },
  { key: '30',   label: '30 dias' },
  { key: '60',   label: '60 dias' },
  { key: '90',   label: '90 dias' },
  { key: '180',  label: '6 meses' },
  { key: 'ano',  label: 'Este ano' },
  { key: 'custom', label: 'Personalizado' },
]

function getPeriodDates(preset: PeriodPreset, customStart: string, customEnd: string): { start: string; end: string; prevStart: string; prevEnd: string } {
  if (preset === 'hoje') {
    const t = today()
    const yest = daysAgo(1)
    return { start: t, end: t, prevStart: yest, prevEnd: yest }
  }
  const end = today()
  let start: string
  let days: number

  if (preset === 'custom') {
    start = customStart || daysAgo(30)
    const s = new Date(start)
    const e = new Date(customEnd || end)
    days = Math.ceil((e.getTime() - s.getTime()) / 864e5)
    const prevStart = new Date(s.getTime() - days * 864e5).toISOString().slice(0, 10)
    return { start, end: customEnd || end, prevStart, prevEnd: start }
  }

  if (preset === 'ano') {
    start = `${new Date().getFullYear()}-01-01`
    days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 864e5)
    const prevStart = `${new Date().getFullYear() - 1}-01-01`
    const prevEnd   = `${new Date().getFullYear() - 1}-12-31`
    return { start, end, prevStart, prevEnd }
  }

  days = parseInt(preset)
  start = daysAgo(days)
  return { start, end, prevStart: daysAgo(days * 2), prevEnd: start }
}

// ─── Template de relatório PDF ──────────────────────────────
function PdfTemplate({
  clientes, filteredMetrics, kpis, chartData, byProvider, selectedCliente,
  periodLabel, dateStart, dateEnd,
}: {
  clientes: Cliente[]
  filteredMetrics: MetricRow[]
  kpis: any
  chartData: any[]
  byProvider: any[]
  selectedCliente: string
  periodLabel: string
  dateStart: string
  dateEnd: string
}) {
  const clienteLabel = selectedCliente === 'all'
    ? 'Todos os clientes'
    : (clientes.find(c => c.id === selectedCliente)?.nome_empresa || selectedCliente)

  const formatDate = (d: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const style: React.CSSProperties = {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    background: '#0A0413',
    color: '#F3EEF8',
    padding: '48px',
    width: 794,
    minHeight: 1123,
  }

  const kpiItems = [
    { label: 'Investimento total',  value: fmt(kpis.spend, 'currency'),   color: '#7C3AED' },
    { label: 'Receita atribuída',   value: fmt(kpis.revenue, 'currency'),  color: '#10B981' },
    { label: 'ROAS',                value: fmt(kpis.roas, 'x'),            color: '#F5A623' },
    { label: 'CAC',                 value: fmt(kpis.cac, 'currency'),      color: '#0EA5E9' },
    { label: 'Pedidos / Compras',   value: fmt(kpis.orders, 'number', 0),  color: '#F59E0B' },
    { label: 'Ticket médio',        value: fmt(kpis.ticket, 'currency'),   color: '#EC4899' },
    { label: 'Sessões',             value: fmt(kpis.sessions, 'number', 0), color: '#AE96D6' },
  ]

  // Ranking por cliente (quando "todos")
  const ranking = selectedCliente === 'all'
    ? clientes.map(c => {
        const rows = filteredMetrics.filter(m => m.client_id === c.id)
        if (!rows.length) return null
        const s = sum(rows, 'spend')
        const r = sum(rows, 'revenue') || sum(rows, 'purchase_value')
        const o = sum(rows, 'orders') || sum(rows, 'purchases')
        const roas = s > 0 ? r / s : 0
        return { nome: c.nome_empresa, spend: s, revenue: r, orders: o, roas }
      }).filter(Boolean).sort((a: any, b: any) => b.revenue - a.revenue)
    : []

  return (
    <div style={style}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 20, borderBottom: '2px solid #7C3AED' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: '0.08em', color: '#F5A623', marginBottom: 2 }}>VETTOR 28</div>
          <div style={{ fontSize: 12, color: '#AE96D6' }}>Agência de Performance para E-commerce</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F3EEF8', marginBottom: 2 }}>Relatório de Resultados</div>
          <div style={{ fontSize: 12, color: '#AE96D6' }}>{clienteLabel}</div>
          <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 3 }}>
            {periodLabel} — {formatDate(dateStart)} a {formatDate(dateEnd)}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AE96D6', marginBottom: 14 }}>
          📊 Resumo de Performance
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {kpiItems.map(k => (
            <div key={k.label} style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: `1px solid ${k.color}28` }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#AE96D6', lineHeight: 1.3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Investimento por canal */}
      {byProvider.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AE96D6', marginBottom: 12 }}>
            💰 Investimento por canal
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {byProvider.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'rgba(19,8,35,0.6)', border: '1px solid rgba(174,150,214,0.1)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span style={{ fontSize: 12, color: '#F3EEF8', fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: '#AE96D6' }}>{fmt(p.value, 'currency')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolução diária — tabela compacta */}
      {chartData.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AE96D6', marginBottom: 12 }}>
            📈 Evolução diária
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(174,150,214,0.2)' }}>
                  {['Data', 'Investimento', 'Receita', 'ROAS', 'Sessões', 'Pedidos'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#AE96D6', fontWeight: 600, letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.slice(-20).map((row, i) => (
                  <tr key={row.date} style={{ borderBottom: '1px solid rgba(174,150,214,0.07)', background: i % 2 === 0 ? 'transparent' : 'rgba(124,58,237,0.03)' }}>
                    <td style={{ padding: '5px 10px', color: '#AE96D6' }}>{row.date}</td>
                    <td style={{ padding: '5px 10px', color: '#7C3AED', fontWeight: 600 }}>R$ {row.Investimento?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '5px 10px', color: '#10B981', fontWeight: 600 }}>R$ {row.Receita?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '5px 10px', color: '#F5A623' }}>{row.ROAS?.toFixed(2)}x</td>
                    <td style={{ padding: '5px 10px', color: '#F3EEF8' }}>{row.Sessões?.toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '5px 10px', color: '#F3EEF8' }}>{row.Pedidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ranking por cliente */}
      {ranking.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AE96D6', marginBottom: 12 }}>
            🏆 Ranking por cliente
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(174,150,214,0.2)' }}>
                {['#', 'Cliente', 'Investimento', 'Receita', 'Pedidos', 'ROAS'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#AE96D6', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(ranking as any[]).map((r: any, i: number) => (
                <tr key={r.nome} style={{ borderBottom: '1px solid rgba(174,150,214,0.07)' }}>
                  <td style={{ padding: '5px 10px', color: '#7C3AED', fontWeight: 700 }}>#{i + 1}</td>
                  <td style={{ padding: '5px 10px', color: '#F3EEF8', fontWeight: 600 }}>{r.nome}</td>
                  <td style={{ padding: '5px 10px', color: '#AE96D6' }}>R$ {r.spend?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '5px 10px', color: '#10B981', fontWeight: 600 }}>R$ {r.revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '5px 10px', color: '#F3EEF8' }}>{r.orders}</td>
                  <td style={{ padding: '5px 10px', color: r.roas >= 3 ? '#34D399' : r.roas >= 1 ? '#F5A623' : '#F87171', fontWeight: 700 }}>{r.roas?.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid rgba(174,150,214,0.12)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(174,150,214,0.4)' }}>
        <span>VETTOR 28 — vettor28.com.br</span>
        <span>Gerado em {new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}</span>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────
export function ResultadosClient({ clientes, metrics, dateStart, dateEnd }: Props) {
  const [selectedCliente, setSelectedCliente] = useState<string>('all')
  const [period, setPeriod] = useState<PeriodPreset>('30')
  const [customStart, setCustomStart] = useState(daysAgo(30))
  const [customEnd, setCustomEnd]     = useState(today())
  const [showCustom, setShowCustom]   = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfOk, setPdfOk]             = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  // Datas efetivas do período
  const { start: filterStart, end: filterEnd, prevStart, prevEnd } = useMemo(
    () => getPeriodDates(period, customStart, customEnd),
    [period, customStart, customEnd]
  )

  // Período label para exibição
  const periodLabel = useMemo(() => {
    const opt = PERIOD_OPTIONS.find(o => o.key === period)
    return opt?.label || period
  }, [period])

  // Filtra por cliente e período
  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      if (m.date < filterStart || m.date > filterEnd) return false
      if (selectedCliente !== 'all' && m.client_id !== selectedCliente) return false
      return true
    })
  }, [metrics, selectedCliente, filterStart, filterEnd])

  // Período anterior para comparação
  const prevMetrics = useMemo(() => {
    return metrics.filter(m => {
      if (m.date < prevStart || m.date > prevEnd) return false
      if (selectedCliente !== 'all' && m.client_id !== selectedCliente) return false
      return true
    })
  }, [metrics, selectedCliente, prevStart, prevEnd])

  // KPIs agregados
  const kpis = useMemo(() => {
    const spend    = sum(filteredMetrics, 'spend')
    const revenue  = sum(filteredMetrics, 'revenue') || sum(filteredMetrics, 'purchase_value')
    const orders   = sum(filteredMetrics, 'orders') || sum(filteredMetrics, 'purchases')
    const sessions = sum(filteredMetrics, 'sessions')
    const roas     = spend > 0 ? revenue / spend : 0
    const cac      = orders > 0 ? spend / orders : 0
    const ticket   = orders > 0 ? revenue / orders : 0

    const prev = {
      spend:    sum(prevMetrics, 'spend'),
      revenue:  sum(prevMetrics, 'revenue') || sum(prevMetrics, 'purchase_value'),
      orders:   sum(prevMetrics, 'orders') || sum(prevMetrics, 'purchases'),
      sessions: sum(prevMetrics, 'sessions'),
    }

    return { spend, revenue, orders, sessions, roas, cac, ticket, prev }
  }, [filteredMetrics, prevMetrics])

  // Dados por dia para os gráficos
  const chartData = useMemo(() => {
    const byDay = aggregateByDay(filteredMetrics)
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: date.slice(5), // MM-DD
        Investimento: d.spend ? +d.spend.toFixed(2) : 0,
        Receita: (d.revenue || d.purchase_value || 0) > 0 ? +((d.revenue || d.purchase_value || 0)).toFixed(2) : 0,
        ROAS: d.roas ? +d.roas.toFixed(2) : 0,
        Sessões: d.sessions || 0,
        Pedidos: (d.orders || d.purchases || 0),
        CAC: d.cac ? +d.cac.toFixed(2) : 0,
      }))
  }, [filteredMetrics])

  // Distribuição por provider
  const byProvider = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of filteredMetrics) {
      if (m.spend) map[m.provider] = (map[m.provider] || 0) + m.spend
    }
    return Object.entries(map).map(([name, value]) => ({ name: PROVIDER_LABELS[name] || name, value: +value.toFixed(2) }))
  }, [filteredMetrics])

  const spendTrend    = trend(kpis.spend, kpis.prev.spend)
  const revenueTrend  = trend(kpis.revenue, kpis.prev.revenue)
  const ordersTrend   = trend(kpis.orders, kpis.prev.orders)
  const sessionsTrend = trend(kpis.sessions, kpis.prev.sessions)

  const hasData = filteredMetrics.length > 0

  // ── Gera PDF ──────────────────────────────────────────────
  async function handleExportPdf() {
    if (!pdfRef.current) return
    setGeneratingPdf(true)
    setPdfOk(false)
    await new Promise(r => setTimeout(r, 350))

    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF }       = await import('jspdf')

    const canvas = await html2canvas(pdfRef.current, {
      backgroundColor: '#0A0413',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 794,
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const imgData  = canvas.toDataURL('image/png')
    const pdfW     = pdf.internal.pageSize.getWidth()
    const pdfH     = (canvas.height * pdfW) / canvas.width
    const pageH    = pdf.internal.pageSize.getHeight()

    let yPos = 0
    while (yPos < pdfH) {
      if (yPos > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, pdfH)
      yPos += pageH
    }

    const nomCliente = selectedCliente === 'all'
      ? 'Todos'
      : (clientes.find(c => c.id === selectedCliente)?.nome_empresa || 'Cliente').replace(/\s+/g, '_')

    pdf.save(`VETTOR28_Resultados_${nomCliente}_${filterStart}_${filterEnd}.pdf`)
    setGeneratingPdf(false)
    setPdfOk(true)
    setTimeout(() => setPdfOk(false), 3000)
  }

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BarChart2 size={22} style={{ color: 'var(--violet-2)' }} />
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)' }}>
              Resultados &amp; KPIs
            </h1>
          </div>

          {/* Botão PDF */}
          <button
            id="btn-exportar-pdf"
            onClick={handleExportPdf}
            disabled={generatingPdf || !hasData}
            className="btn btn-primary"
            style={{ gap: 8 }}
          >
            {generatingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {pdfOk ? '✅ PDF gerado!' : generatingPdf ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
        <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
          Performance consolidada de todos os canais. Comparação com período anterior.
        </p>
      </div>

      {/* ── Filtros ────────────────────────────────────────── */}
      <div className="glass animate-fade-in-up delay-100" style={{ padding: '16px 18px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Seletor de cliente */}
          <select
            value={selectedCliente}
            onChange={e => setSelectedCliente(e.target.value)}
            className="input-vettor"
            style={{ height: 38, fontSize: 13, cursor: 'pointer', minWidth: 200 }}
          >
            <option value="all">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
          </select>

          {/* Pills de período */}
          <div style={{ display: 'flex', gap: 3, background: 'rgba(19,8,35,0.6)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  setPeriod(opt.key)
                  if (opt.key === 'custom') setShowCustom(true)
                  else setShowCustom(false)
                }}
                style={{
                  padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: period === opt.key ? 700 : 400,
                  background: period === opt.key
                    ? opt.key === 'custom'
                      ? 'linear-gradient(135deg, var(--amber), #e06b00)'
                      : 'linear-gradient(135deg, var(--violet), var(--violet-2))'
                    : 'transparent',
                  color: period === opt.key ? 'white' : 'var(--lilac)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {opt.key === 'custom' && <Calendar size={11} />}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Info: registros e range */}
          <span style={{ fontSize: 12, color: 'var(--lilac)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {filteredMetrics.length} registros &bull; {filterStart} → {filterEnd}
          </span>
        </div>

        {/* Painel de data personalizada */}
        {showCustom && period === 'custom' && (
          <div className="animate-fade-in-up" style={{
            marginTop: 14, padding: '16px 18px', borderRadius: 10,
            background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.25)',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <Calendar size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--lilac)', fontFamily: 'var(--font-data)', fontWeight: 600 }}>Período personalizado:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--lilac)', fontFamily: 'var(--font-data)' }}>De</label>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={e => setCustomStart(e.target.value)}
                className="input-vettor"
                style={{ height: 34, fontSize: 12, width: 148 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--lilac)', fontFamily: 'var(--font-data)' }}>Até</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today()}
                onChange={e => setCustomEnd(e.target.value)}
                className="input-vettor"
                style={{ height: 34, fontSize: 12, width: 148 }}
              />
            </div>
            <button onClick={() => { setShowCustom(false) }} className="btn btn-ghost btn-sm" style={{ padding: 6, marginLeft: 4 }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="glass" style={{ padding: '80px 32px', textAlign: 'center' }}>
          <BarChart2 size={40} style={{ color: 'var(--lilac)', opacity: 0.3, margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 16, fontWeight: 600, color: 'var(--cream)', marginBottom: 8 }}>
            Nenhum dado no período selecionado
          </h3>
          <p style={{ fontSize: 13, color: 'var(--lilac)', maxWidth: 360, margin: '0 auto' }}>
            Configure as integrações ou faça uma entrada manual em <strong>Integrações</strong> para ver os resultados aqui.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="animate-fade-in-up delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <KpiCard label="Investimento" value={fmt(kpis.spend, 'currency')} icon={<DollarSign size={18} />} color="var(--violet)"
              sub={`vs ${fmt(kpis.prev.spend, 'currency')}`} trendDir={spendTrend.dir} trendPct={spendTrend.pct} />
            <KpiCard label="Receita / Conversões" value={fmt(kpis.revenue, 'currency')} icon={<TrendingUp size={18} />} color="#10B981"
              sub={`vs ${fmt(kpis.prev.revenue, 'currency')}`} trendDir={revenueTrend.dir} trendPct={revenueTrend.pct} />
            <KpiCard label="ROAS" value={fmt(kpis.roas, 'x')} icon={<Target size={18} />} color="var(--amber)"
              sub="Retorno sobre investimento" />
            <KpiCard label="CAC" value={fmt(kpis.cac, 'currency')} icon={<ShoppingCart size={18} />} color="#0EA5E9"
              sub="Custo de aquisição" />
            <KpiCard label="Pedidos / Compras" value={fmt(kpis.orders, 'number', 0)} icon={<ShoppingCart size={18} />} color="#F59E0B"
              sub={`vs ${fmt(kpis.prev.orders, 'number', 0)}`} trendDir={ordersTrend.dir} trendPct={ordersTrend.pct} />
            <KpiCard label="Ticket Médio" value={fmt(kpis.ticket, 'currency')} icon={<DollarSign size={18} />} color="#EC4899"
              sub="Receita / Pedidos" />
            <KpiCard label="Sessões" value={fmt(kpis.sessions, 'number', 0)} icon={<Users size={18} />} color="var(--lilac)"
              sub={`vs ${fmt(kpis.prev.sessions, 'number', 0)}`} trendDir={sessionsTrend.dir} trendPct={sessionsTrend.pct} />
          </div>

          {/* Gráficos — linha 1 */}
          <div className="animate-fade-in-up delay-200" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Investimento vs Receita */}
            <div className="glass" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 18 }}>
                Investimento vs Receita — dia a dia
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,150,214,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#AE96D6', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#AE96D6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => fmt(v, 'currency')} />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#AE96D6' }} />
                  <Area type="monotone" dataKey="Investimento" stroke="#7C3AED" fill="url(#gradInvest)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Receita"      stroke="#10B981" fill="url(#gradReceita)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição por canal */}
            <div className="glass" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 18 }}>
                Investimento por canal
              </h3>
              {byProvider.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--lilac)', fontSize: 13 }}>
                  Sem dados de investimento
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byProvider} cx="50%" cy="50%" outerRadius={72} dataKey="value" label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {byProvider.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v as number, 'currency')} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {byProvider.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--lilac)', flex: 1 }}>{p.name}</span>
                    <span style={{ color: 'var(--cream)', fontFamily: 'var(--font-data)', fontWeight: 600 }}>{fmt(p.value, 'currency')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráficos — linha 2 */}
          <div className="animate-fade-in-up delay-200" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* ROAS ao longo do tempo */}
            <div className="glass" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 18 }}>
                ROAS — evolução diária
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,150,214,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#AE96D6', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#AE96D6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `${v.toFixed(2)}x`} />} />
                  <Line type="monotone" dataKey="ROAS" stroke="var(--amber)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Sessões diárias */}
            <div className="glass" style={{ padding: '22px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 18 }}>
                Sessões &amp; Pedidos — dia a dia
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,150,214,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#AE96D6', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#AE96D6', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#AE96D6' }} />
                  <Bar dataKey="Sessões" fill="rgba(124,58,237,0.7)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Pedidos" fill="rgba(245,166,35,0.8)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela por cliente */}
          {selectedCliente === 'all' && (
            <div className="glass animate-fade-in-up delay-300" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>
                  Ranking por cliente — {periodLabel}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--lilac)' }}>{filterStart} → {filterEnd}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-vettor">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Investimento</th>
                      <th>Receita</th>
                      <th>ROAS</th>
                      <th>CAC</th>
                      <th>Pedidos</th>
                      <th>Sessões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(cliente => {
                      const rows = filteredMetrics.filter(m => m.client_id === cliente.id)
                      if (!rows.length) return null
                      const s = sum(rows, 'spend')
                      const r = sum(rows, 'revenue') || sum(rows, 'purchase_value')
                      const o = sum(rows, 'orders') || sum(rows, 'purchases')
                      const ses = sum(rows, 'sessions')
                      const roas = s > 0 ? r / s : 0
                      const cac  = o > 0 ? s / o : 0
                      return (
                        <tr key={cliente.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 7,
                                background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontFamily: 'var(--font-title)', color: 'white',
                              }}>
                                {cliente.nome_empresa.slice(0, 1)}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)' }}>
                                {cliente.nome_empresa}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--cream)' }}>{fmt(s, 'currency')}</td>
                          <td style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: '#10B981', fontWeight: 600 }}>{fmt(r, 'currency')}</td>
                          <td>
                            <span className={`badge ${roas >= 3 ? 'badge-green' : roas >= 1 ? 'badge-amber' : 'badge-red'}`}>
                              {fmt(roas, 'x')}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--lilac)' }}>{fmt(cac, 'currency')}</td>
                          <td style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--cream)' }}>{fmt(o, 'number', 0)}</td>
                          <td style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--lilac)' }}>{fmt(ses, 'number', 0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Template oculto para captura PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }} aria-hidden>
        <div ref={pdfRef}>
          <PdfTemplate
            clientes={clientes}
            filteredMetrics={filteredMetrics}
            kpis={kpis}
            chartData={chartData}
            byProvider={byProvider}
            selectedCliente={selectedCliente}
            periodLabel={periodLabel}
            dateStart={filterStart}
            dateEnd={filterEnd}
          />
        </div>
      </div>
    </div>
  )
}
