'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Plug, TrendingUp, DollarSign, Target,
  CheckCircle2, BarChart2, ArrowRight, Wifi, WifiOff, ShoppingCart,
  Calendar, Star, Zap, Sparkles, Receipt, Activity
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { StatCard } from '@/components/ui/StatCard'
import { Sparkline } from '@/components/ui/Sparkline'
import { DateFilter } from '@/components/ui/DateFilter'
import { getPeriodRange, todayISO, daysAgoISO, PeriodPreset } from '@/lib/date-range'

interface Props {
  profile: { id: string; nome: string; role: string; email: string }
  clientes: any[]
  integracoes: any[]
  metrics: any[]
  tarefas: any[]
  onboarding: any[]
  contratos: any[]
}

function fmtCurrency(n: number): string {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1000) return `R$ ${(n / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtCurrencyFull(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}
function pctDelta(cur: number, prev: number): number | null {
  if (!prev || prev === 0) return null
  return ((cur - prev) / prev) * 100
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: '#F87171' },
  alta:    { label: 'Alta',    color: '#F5A623' },
  media:   { label: 'Média',   color: '#AE96D6' },
  baixa:   { label: 'Baixa',   color: 'rgba(174,150,214,0.5)' },
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 864e5)
}

export function DashboardClient({ profile, clientes, integracoes, metrics, tarefas, onboarding, contratos }: Props) {
  // Saudação calculada só no cliente (evita mismatch de hidratação SSR/cliente)
  const [saudacao, setSaudacao] = useState('Boa noite')
  useEffect(() => {
    const h = new Date().getHours()
    setSaudacao(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')
  }, [])
  const [period, setPeriod] = useState<PeriodPreset>('30')
  const [customStart, setCustomStart] = useState(daysAgoISO(30))
  const [customEnd, setCustomEnd] = useState(todayISO())
  const range = getPeriodRange(period, customStart, customEnd)

  // ── Série diária agregada (todos os clientes) ────────────
  const series = useMemo(() => {
    const byDate = new Map<string, { spend: number; revenue: number; orders: number; sessions: number }>()
    for (const m of metrics) {
      const d = m.date
      if (!d) continue
      const cur = byDate.get(d) || { spend: 0, revenue: 0, orders: 0, sessions: 0 }
      cur.spend += m.spend || 0
      cur.revenue += (m.revenue ?? m.purchase_value) || 0
      cur.orders += (m.orders ?? m.purchases) || 0
      cur.sessions += (m.sessions ?? m.users) || 0
      byDate.set(d, cur)
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }))
  }, [metrics])

  // ── Janelas atual vs. anterior (por intervalo de datas) ──
  const { cur, prev, window } = useMemo(() => {
    const inRange = (d: string, s: string, e: string) => d >= s && d <= e
    const curSlice = series.filter(r => inRange(r.date, range.start, range.end))
    const prevSlice = series.filter(r => inRange(r.date, range.prevStart, range.prevEnd))
    const agg = (rows: typeof series) => rows.reduce(
      (a, r) => ({ spend: a.spend + r.spend, revenue: a.revenue + r.revenue, orders: a.orders + r.orders, sessions: a.sessions + r.sessions }),
      { spend: 0, revenue: 0, orders: 0, sessions: 0 },
    )
    return { cur: agg(curSlice), prev: agg(prevSlice), window: curSlice }
  }, [series, range.start, range.end, range.prevStart, range.prevEnd])

  const roas = cur.spend > 0 ? cur.revenue / cur.spend : 0
  const roasPrev = prev.spend > 0 ? prev.revenue / prev.spend : 0
  const ticket = cur.orders > 0 ? cur.revenue / cur.orders : 0
  const cac = cur.orders > 0 ? cur.spend / cur.orders : 0

  const sparkRevenue = window.map(d => d.revenue)
  const sparkSpend = window.map(d => d.spend)
  const sparkOrders = window.map(d => d.orders)
  const sparkRoas = window.map(d => (d.spend > 0 ? d.revenue / d.spend : 0))

  const chartData = window.map(d => ({
    date: d.date.slice(5).replace('-', '/'),
    Receita: Math.round(d.revenue),
    Investimento: Math.round(d.spend),
  }))

  // ── Coleções auxiliares ──────────────────────────────────
  const clientesAtivos = clientes.filter(c => c.ativo)
  const integracoesErro = integracoes.filter(i => i.status === 'erro')
  const integracoesAtivas = integracoes.filter(i => i.status === 'ativo')
  const onboardingAtivos = onboarding.filter(o => o.status === 'em_andamento')
  const contratosAlerta = contratos.filter(c => c.vigencia && daysUntil(c.vigencia) <= 30 && daysUntil(c.vigencia) >= 0)
  const recentClientes = [...clientes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // ── Insight automático ───────────────────────────────────
  const insight = useMemo(() => {
    const dRev = pctDelta(cur.revenue, prev.revenue)
    const dRoas = pctDelta(roas, roasPrev)
    if (dRev != null && Math.abs(dRev) >= 3) {
      const dir = dRev >= 0 ? 'subiu' : 'caiu'
      const roasTxt = dRoas != null ? ` e o ROAS está em ${roas.toFixed(2)}x` : ''
      return {
        good: dRev >= 0,
        text: `A receita ${dir} ${Math.abs(dRev).toFixed(1)}% vs. o período anterior${roasTxt}.`,
      }
    }
    return { good: true, text: `ROAS médio de ${roas.toFixed(2)}x no período — investimento de ${fmtCurrencyFull(cur.spend)} gerando ${fmtCurrencyFull(cur.revenue)}.` }
  }, [cur, prev, roas, roasPrev])

  const periodLabel = range.label

  return (
    <div>
      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <div className="animate-fade-in-up" style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 30, letterSpacing: '0.02em', color: 'var(--cream)', marginBottom: 4 }}>
          {saudacao}, {profile.nome.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: 'var(--lilac)', fontSize: 14 }}>Visão geral da sua operação — {periodLabel}.</p>
      </div>

      {/* ── Filtro de período (Hoje · 7/30/60/90 · Personalizado) ── */}
      <div className="animate-fade-in-up" style={{ marginBottom: 16 }}>
        <DateFilter
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          hint={`${window.length} ${window.length === 1 ? 'dia' : 'dias'} no período`}
        />
      </div>

      {/* ── Insight automático ────────────────────────────── */}
      <div className="insight animate-fade-in-up" style={{ marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={17} style={{ color: 'var(--violet-2)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-data)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lilac)', marginBottom: 2 }}>
            Insight automático
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--cream)' }}>{insight.text}</div>
        </div>
      </div>

      {/* ── Alertas críticos ──────────────────────────────── */}
      {(integracoesErro.length > 0 || contratosAlerta.length > 0) && (
        <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {integracoesErro.length > 0 && (
            <Link href="/integracoes" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                <WifiOff size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--danger)', flex: 1 }}>
                  <strong>{integracoesErro.length}</strong> integração{integracoesErro.length > 1 ? 'ões' : ''} com erro — clique para verificar
                </span>
                <ArrowRight size={14} style={{ color: 'var(--danger)' }} />
              </div>
            </Link>
          )}
          {contratosAlerta.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)' }}>
              <Calendar size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--warning)' }}>Contrato vence em <strong>{daysUntil(c.vigencia)} dias</strong></span>
            </div>
          ))}
        </div>
      )}

      {/* ── Boas-vindas (quando ainda não há clientes) ────── */}
      {clientes.length === 0 && (
        <div className="panel animate-fade-in-up" style={{
          padding: '26px 30px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap',
          background: 'linear-gradient(110deg, rgba(124,58,237,0.14), rgba(56,189,248,0.05))',
          border: '1px solid rgba(124,58,237,0.3)',
        }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, var(--violet), var(--violet-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 20px rgba(124,58,237,0.4)' }}>
            <Sparkles size={26} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: 21, color: 'var(--cream)', marginBottom: 4 }}>Bem-vindo à VETTOR 28! 🚀</h3>
            <p style={{ fontSize: 13.5, color: 'var(--lilac)', maxWidth: 540, lineHeight: 1.5 }}>
              Seu painel está pronto. Cadastre o primeiro cliente e conecte as integrações (Meta Ads, Google Ads, GA4) — receita, ROAS e os KPIs vão ganhar vida aqui automaticamente.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/clientes" className="btn btn-primary" style={{ gap: 7 }}><Users size={15} /> Adicionar cliente</Link>
            <Link href="/integracoes" className="btn btn-secondary" style={{ gap: 7 }}><Plug size={15} /> Integrar plataforma</Link>
          </div>
        </div>
      )}

      {/* ── KPIs herói ────────────────────────────────────── */}
      <div className="animate-fade-in-up delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
        <StatCard label="Receita atribuída" value={fmtCurrency(cur.revenue)} icon={<TrendingUp size={18} />} color="#34D399" href="/resultados" delta={pctDelta(cur.revenue, prev.revenue)} sparkline={sparkRevenue} sub={`${periodLabel} • vs. período anterior`} />
        <StatCard label="Investimento" value={fmtCurrency(cur.spend)} icon={<DollarSign size={18} />} color="#38BDF8" href="/resultados" delta={pctDelta(cur.spend, prev.spend)} sparkline={sparkSpend} sub={`${periodLabel} • mídia paga`} />
        <StatCard label="ROAS médio" value={`${roas.toFixed(2)}x`} icon={<Target size={18} />} color="var(--amber)" href="/resultados" delta={pctDelta(roas, roasPrev)} sparkline={sparkRoas} sub="retorno sobre investimento" />
        <StatCard label="Pedidos" value={fmtNum(cur.orders)} icon={<ShoppingCart size={18} />} color="var(--violet-2)" href="/resultados" delta={pctDelta(cur.orders, prev.orders)} sparkline={sparkOrders} sub={`ticket médio ${fmtCurrencyFull(ticket)}`} />
      </div>

      {/* ── Gráfico + stats secundários ───────────────────── */}
      <div className="animate-fade-in-up delay-200 dash-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 16 }}>
        {/* Área: Receita vs Investimento */}
        <div className="panel" style={{ padding: '18px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 className="panel-title"><Activity size={16} style={{ color: 'var(--violet-2)' }} /> Receita vs. Investimento</h3>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, fontFamily: 'var(--font-data)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--lilac)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#34D399' }} /> Receita</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--lilac)' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#38BDF8' }} /> Investimento</span>
            </div>
          </div>
          {window.length === 0 ? (
            <div style={{ width: '100%', height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
              <Activity size={28} style={{ color: 'var(--text-dim)' }} />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-data)', color: 'var(--text-muted)' }}>Sem dados no período</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 320 }}>Conecte uma integração ou faça uma entrada manual para ver a evolução de receita e investimento.</span>
            </div>
          ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(174,150,214,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(174,150,214,0.6)', fontSize: 10, fontFamily: 'var(--font-data)' }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fill: 'rgba(174,150,214,0.6)', fontSize: 10, fontFamily: 'var(--font-data)' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={38} />
                <Tooltip
                  contentStyle={{ background: '#1C0F35', border: '1px solid rgba(174,150,214,0.3)', borderRadius: 10, fontFamily: 'var(--font-data)', fontSize: 12 }}
                  labelStyle={{ color: '#AE96D6' }}
                  formatter={(value, name) => [fmtCurrencyFull(Number(value ?? 0)), String(name)]}
                />
                <Area type="monotone" dataKey="Receita" stroke="#34D399" strokeWidth={2} fill="url(#gRev)" />
                <Area type="monotone" dataKey="Investimento" stroke="#38BDF8" strokeWidth={2} fill="url(#gSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        {/* Stats secundários */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Clientes ativos', value: String(clientesAtivos.length), icon: <Users size={16} />, color: 'var(--violet)', href: '/clientes', sub: `${clientes.length} no total` },
            { label: 'Integrações ativas', value: String(integracoesAtivas.length), icon: <Wifi size={16} />, color: '#34D399', href: '/integracoes', sub: integracoesErro.length > 0 ? `${integracoesErro.length} com erro` : 'todas saudáveis' },
            { label: 'Em onboarding', value: String(onboardingAtivos.length), icon: <Zap size={16} />, color: '#A855F7', href: '/onboarding', sub: 'clientes em andamento' },
            { label: 'CAC médio', value: fmtCurrencyFull(cac), icon: <Receipt size={16} />, color: 'var(--amber)', href: '/resultados', sub: 'custo por aquisição' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', transition: 'border-color .2s', }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}1f`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 19, fontWeight: 700, color: 'var(--cream)' }}>{s.value}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--lilac)' }}>{s.label} <span style={{ color: 'var(--text-dim)' }}>· {s.sub}</span></div>
                </div>
                <ArrowRight size={15} style={{ color: 'var(--text-dim)' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Tarefas + clientes ────────────────────────────── */}
      <div className="animate-fade-in-up delay-200" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head">
            <h3 className="panel-title"><BarChart2 size={16} style={{ color: 'var(--violet-2)' }} /> Tarefas pendentes</h3>
            <Link href="/tarefas" className="btn btn-ghost btn-sm" style={{ gap: 5, fontSize: 12 }}>Ver todas <ArrowRight size={12} /></Link>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tarefas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--lilac)', fontSize: 13 }}>
                <CheckCircle2 size={24} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                Nenhuma tarefa pendente 🎉
              </div>
            ) : tarefas.map(t => {
              const pCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG['media']
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(19,8,35,0.4)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: pCfg.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pCfg.color, fontFamily: 'var(--font-data)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{pCfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head">
            <h3 className="panel-title"><Users size={16} style={{ color: 'var(--violet-2)' }} /> Clientes recentes</h3>
            <Link href="/clientes" className="btn btn-ghost btn-sm" style={{ gap: 5, fontSize: 12 }}>Ver todos <ArrowRight size={12} /></Link>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentClientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--lilac)', fontSize: 13 }}>Nenhum cliente cadastrado ainda.</div>
            ) : recentClientes.map(c => {
              const clientIntegracoes = integracoes.filter(i => i.client_id === c.id)
              const hasErro = clientIntegracoes.some(i => i.status === 'erro')
              return (
                <Link key={c.id} href={`/clientes/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(19,8,35,0.4)', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--violet), var(--violet-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-title)', fontSize: 14, color: 'white', flexShrink: 0 }}>{c.nome_empresa.slice(0, 1)}</div>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--cream)', fontFamily: 'var(--font-data)', fontWeight: 500 }}>{c.nome_empresa}</span>
                    {hasErro && <WifiOff size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                    {!c.ativo && <span className="badge badge-red" style={{ fontSize: 9 }}>Inativo</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Atalhos rápidos ───────────────────────────────── */}
      <div className="panel animate-fade-in-up delay-300" style={{ padding: '20px 24px' }}>
        <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: 'var(--lilac)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Atalhos rápidos</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { href: '/clientes', label: 'Novo cliente', icon: <Users size={14} />, primary: true },
            { href: '/integracoes', label: 'Integrar plataforma', icon: <Plug size={14} />, primary: false },
            { href: '/resultados', label: 'Ver resultados', icon: <BarChart2 size={14} />, primary: false },
            { href: '/relatorios', label: 'Gerar relatório', icon: <Star size={14} />, primary: false },
            { href: '/onboarding', label: 'Onboarding', icon: <CheckCircle2 size={14} />, primary: false },
            { href: '/configuracoes', label: 'Configurações', icon: <Zap size={14} />, primary: false },
          ].map(a => (
            <Link key={a.href} href={a.href} className={a.primary ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} style={{ gap: 6 }}>{a.icon} {a.label}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}
