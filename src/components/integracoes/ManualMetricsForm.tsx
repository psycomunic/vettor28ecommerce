'use client'

import { useState } from 'react'
import { X, Loader2, Pencil, TrendingUp, Users, ShoppingCart, BarChart2 } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  onClose: () => void
  onSaved: () => void
}

interface MetricsForm {
  date: string
  // Paid media
  spend: string
  impressions: string
  clicks: string
  purchases: string
  purchase_value: string
  // GA4
  sessions: string
  users: string
  new_users: string
  // E-commerce
  orders: string
  revenue: string
}

type MetricsSection = 'paid' | 'organic' | 'ecommerce'

export function ManualMetricsForm({ clientId, clientName, onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [section, setSection] = useState<MetricsSection>('paid')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<MetricsForm>({
    date: today,
    spend: '', impressions: '', clicks: '', purchases: '', purchase_value: '',
    sessions: '', users: '', new_users: '',
    orders: '', revenue: '',
  })

  function update(k: keyof MetricsForm, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  function n(v: string) { return v !== '' ? parseFloat(v) : undefined }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const spend = n(form.spend)
    const purchases = n(form.purchases)
    const purchaseValue = n(form.purchase_value)
    const orders = n(form.orders)
    const revenue = n(form.revenue)

    const metrics = {
      spend,
      impressions: n(form.impressions),
      clicks: n(form.clicks),
      ctr: spend && n(form.clicks) ? (n(form.clicks)! / n(form.impressions)! * 100) : undefined,
      purchases,
      purchase_value: purchaseValue,
      roas: spend && purchaseValue ? purchaseValue / spend : undefined,
      cac: spend && purchases ? spend / purchases : undefined,
      sessions: n(form.sessions),
      users: n(form.users),
      new_users: n(form.new_users),
      orders,
      revenue,
      avg_ticket: orders && revenue ? revenue / orders : undefined,
    }

    const res = await fetch('/api/integrations/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, date: form.date, metrics }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erro ao salvar métricas.')
    } else {
      onSaved()
    }
    setLoading(false)
  }

  const SECTIONS = [
    { id: 'paid'     as MetricsSection, label: 'Mídia Paga',    icon: <TrendingUp size={14} /> },
    { id: 'organic'  as MetricsSection, label: 'Tráfego',       icon: <Users size={14} /> },
    { id: 'ecommerce'as MetricsSection, label: 'E-commerce',    icon: <ShoppingCart size={14} /> },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="glass animate-fade-in-up" style={{ width: '100%', maxWidth: 540, padding: 32, maxHeight: '90dvh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--cream)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pencil size={18} style={{ color: 'var(--violet-2)' }} />
              Entrada Manual
            </h2>
            <p style={{ fontSize: 13, color: 'var(--lilac)', marginTop: 2 }}>{clientName}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Data */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>
              Data de referência *
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className="input-vettor"
              max={today}
            />
          </div>

          {/* Tabs de seção */}
          <div style={{ display: 'flex', background: 'rgba(19,8,35,0.6)', borderRadius: 8, padding: 4, gap: 2 }}>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: section === s.id ? 600 : 400,
                  background: section === s.id ? 'linear-gradient(135deg, var(--violet), var(--violet-2))' : 'transparent',
                  color: section === s.id ? 'white' : 'var(--lilac)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Campos: Mídia Paga */}
          {section === 'paid' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'spend' as const,          label: 'Investimento (R$)',  placeholder: '0.00' },
                { key: 'impressions' as const,     label: 'Impressões',         placeholder: '0' },
                { key: 'clicks' as const,          label: 'Cliques',            placeholder: '0' },
                { key: 'purchases' as const,       label: 'Compras',            placeholder: '0' },
                { key: 'purchase_value' as const,  label: 'Receita atribuída (R$)', placeholder: '0.00' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.key === 'spend' ? '1 / -1' : undefined }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>{f.label}</label>
                  <input
                    type="number" step="0.01" min="0"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    className="input-vettor"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Campos: Tráfego orgânico */}
          {section === 'organic' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'sessions'  as const, label: 'Sessões',        placeholder: '0' },
                { key: 'users'     as const, label: 'Usuários',       placeholder: '0' },
                { key: 'new_users' as const, label: 'Novos usuários', placeholder: '0' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>{f.label}</label>
                  <input
                    type="number" min="0"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    className="input-vettor"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Campos: E-commerce */}
          {section === 'ecommerce' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'orders'  as const, label: 'Pedidos',          placeholder: '0' },
                { key: 'revenue' as const, label: 'Faturamento (R$)', placeholder: '0.00' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>{f.label}</label>
                  <input
                    type="number" step="0.01" min="0"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    className="input-vettor"
                  />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', padding: '10px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', fontSize: 12, color: 'var(--lilac)' }}>
                💡 O ticket médio é calculado automaticamente (Faturamento ÷ Pedidos).
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <BarChart2 size={15} />}
              Salvar métricas
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
