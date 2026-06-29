'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Building2, User, Mail, Phone, Hash } from 'lucide-react'
import { PLATFORM_OPTIONS, SEGMENT_OPTIONS, ONBOARDING_LABELS } from '@/lib/utils'
import type { Client, Plan } from '@/types/database'

interface ClienteFormProps {
  cliente?: Client // Se fornecido, é edição
  onClose: () => void
  onSaved: () => void
}

export function ClienteForm({ cliente, onClose, onSaved }: ClienteFormProps) {
  const isEditing = !!cliente
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState({
    nome_empresa: cliente?.nome_empresa ?? '',
    cnpj: cliente?.cnpj ?? '',
    segmento: cliente?.segmento ?? '',
    plataforma: cliente?.plataforma ?? '',
    contato_nome: cliente?.contato_nome ?? '',
    contato_email: cliente?.contato_email ?? '',
    contato_whatsapp: cliente?.contato_whatsapp ?? '',
    status_onboarding: cliente?.status_onboarding ?? 'pendente',
    plano_id: cliente?.plano_id ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  // Busca planos disponíveis
  useEffect(() => {
    async function fetchPlans() {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('plans').select('*').order('ordem')
        setPlans(data || [])
      } catch { /* silent */ }
    }
    fetchPlans()
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      nome_empresa: form.nome_empresa,
      cnpj: form.cnpj || null,
      segmento: form.segmento || null,
      plataforma: form.plataforma || null,
      contato_nome: form.contato_nome || null,
      contato_email: form.contato_email || null,
      contato_whatsapp: form.contato_whatsapp || null,
      status_onboarding: form.status_onboarding,
      plano_id: form.plano_id || null,
    }

    const supabase = createClient()
    let err
    if (isEditing) {
      const res = await supabase.from('clients').update(payload).eq('id', cliente!.id)
      err = res.error
    } else {
      const res = await supabase.from('clients').insert(payload)
      err = res.error
    }

    if (err) {
      setError(err.message)
    } else {
      onSaved()
    }
    setLoading(false)
  }

  return (
    /* Overlay */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,4,19,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Modal */}
      <div className="glass animate-fade-in-up" style={{
        width: '100%', maxWidth: 600,
        maxHeight: '90dvh',
        overflowY: 'auto',
        padding: '32px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--cream)', letterSpacing: '0.02em' }}>
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <p style={{ color: 'var(--lilac)', fontSize: 13, marginTop: 2 }}>
              {isEditing ? `Editando ${cliente!.nome_empresa}` : 'Preencha os dados da empresa'}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Seção: Empresa */}
          <div>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lilac)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={12} /> Dados da Empresa
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>
                  Nome da empresa *
                </label>
                <input
                  id="nome_empresa"
                  required
                  type="text"
                  placeholder="Ex.: Loja da Maria LTDA"
                  value={form.nome_empresa}
                  onChange={e => update('nome_empresa', e.target.value)}
                  className="input-vettor"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>CNPJ</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
                  <input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj}
                    onChange={e => update('cnpj', e.target.value)}
                    className="input-vettor"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Segmento</label>
                <select
                  id="segmento"
                  value={form.segmento}
                  onChange={e => update('segmento', e.target.value)}
                  className="input-vettor"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Selecione...</option>
                  {SEGMENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Plataforma</label>
                <select
                  id="plataforma"
                  value={form.plataforma}
                  onChange={e => update('plataforma', e.target.value)}
                  className="input-vettor"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Selecione...</option>
                  {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Status Onboarding</label>
                <select
                  id="status_onboarding"
                  value={form.status_onboarding}
                  onChange={e => update('status_onboarding', e.target.value)}
                  className="input-vettor"
                  style={{ cursor: 'pointer' }}
                >
                  {Object.entries(ONBOARDING_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Plano</label>
                <select
                  id="plano_id"
                  value={form.plano_id}
                  onChange={e => update('plano_id', e.target.value)}
                  className="input-vettor"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Sem plano definido</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          {/* Seção: Contato */}
          <div>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lilac)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} /> Contato Principal
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Nome do contato</label>
                <input
                  id="contato_nome"
                  type="text"
                  placeholder="Nome completo"
                  value={form.contato_nome}
                  onChange={e => update('contato_nome', e.target.value)}
                  className="input-vettor"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
                  <input
                    id="contato_email"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={form.contato_email}
                    onChange={e => update('contato_email', e.target.value)}
                    className="input-vettor"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>WhatsApp</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
                  <input
                    id="contato_whatsapp"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={form.contato_whatsapp}
                    onChange={e => update('contato_whatsapp', e.target.value)}
                    className="input-vettor"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              id="btn-salvar-cliente"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isEditing ? 'Salvar alterações' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
