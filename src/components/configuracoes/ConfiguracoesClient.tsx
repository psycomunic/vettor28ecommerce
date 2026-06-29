'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Settings, Cpu, Megaphone, BarChart2, Headphones,
  Plus, Pencil, Trash2, X, Check, Loader2, Package,
  ListOrdered, CreditCard, ChevronDown, ChevronRight,
  GripVertical, Save
} from 'lucide-react'
import { Pillar, Deliverable, Plan, OnboardingStep } from '@/types/database'

interface Props {
  pilares: (Pillar & { entregaveis?: Deliverable[] })[]
  entregaveis: (Deliverable & { pillar?: Pillar })[]
  planos: Plan[]
  etapas: OnboardingStep[]
}

type ConfigTab = 'pilares' | 'entregaveis' | 'planos' | 'onboarding'

const CONFIG_TABS: { id: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { id: 'pilares',     label: 'Pilares',            icon: <Cpu size={15} /> },
  { id: 'entregaveis', label: 'Entregáveis',         icon: <Package size={15} /> },
  { id: 'planos',      label: 'Planos',              icon: <CreditCard size={15} /> },
  { id: 'onboarding',  label: 'Etapas Onboarding',  icon: <ListOrdered size={15} /> },
]

const PILAR_ICONS: Record<string, React.ReactNode> = {
  tecnologia:  <Cpu size={16} />,
  marketing:   <Megaphone size={16} />,
  gestao:      <BarChart2 size={16} />,
  atendimento: <Headphones size={16} />,
}

// ── Item inline editável ──────────────────────────────────────
function InlineEditItem({
  id, nome, descricao, onSave, onDelete, extra
}: {
  id: string; nome: string; descricao?: string | null;
  onSave: (id: string, nome: string, descricao: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  extra?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [nomeEdit, setNomeEdit] = useState(nome)
  const [descEdit, setDescEdit] = useState(descricao || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(id, nomeEdit, descEdit)
    setEditing(false)
    setSaving(false)
  }

  if (editing) {
    return (
      <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} className="input-vettor" style={{ fontSize: 13, height: 36 }} placeholder="Nome" />
        <input value={descEdit} onChange={e => setDescEdit(e.target.value)} className="input-vettor" style={{ fontSize: 12, height: 32 }} placeholder="Descrição (opcional)" />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm" style={{ gap: 5 }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salvar
          </button>
          <button onClick={() => { setEditing(false); setNomeEdit(nome); setDescEdit(descricao || '') }} className="btn btn-secondary btn-sm">
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 8, background: 'rgba(19,8,35,0.4)',
      border: '1px solid var(--border-subtle)',
    }} className="glass-hover">
      <GripVertical size={13} style={{ color: 'var(--lilac)', opacity: 0.4, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 500 }}>{nome}</div>
        {descricao && <div style={{ fontSize: 11, color: 'var(--lilac)', marginTop: 2 }}>{descricao}</div>}
      </div>
      {extra}
      <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
        <Pencil size={13} />
      </button>
      <button onClick={() => onDelete(id)} className="btn btn-ghost btn-sm" style={{ padding: 6, color: '#F87171' }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Formulário de adição rápida ────────────────────────────────
function QuickAdd({ placeholder, onAdd, extraFields }: {
  placeholder: string
  onAdd: (nome: string, extra: Record<string, string>) => Promise<void>
  extraFields?: { key: string; label: string; type?: string; options?: { value: string; label: string }[] }[]
}) {
  const [nome, setNome] = useState('')
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleAdd() {
    if (!nome.trim()) return
    setLoading(true)
    await onAdd(nome.trim(), extra)
    setNome('')
    setExtra({})
    setLoading(false)
    setOpen(false)
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', gap: 6, borderStyle: 'dashed' }}>
          <Plus size={14} /> {placeholder}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder={placeholder} className="input-vettor" style={{ fontSize: 13, height: 36 }} onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          {extraFields?.map(f => (
            <div key={f.key}>
              {f.options ? (
                <select value={extra[f.key] || ''} onChange={e => setExtra(p => ({ ...p, [f.key]: e.target.value }))} className="input-vettor" style={{ fontSize: 12, height: 34, cursor: 'pointer' }}>
                  <option value="">-- {f.label} --</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type || 'text'} placeholder={f.label} value={extra[f.key] || ''} onChange={e => setExtra(p => ({ ...p, [f.key]: e.target.value }))} className="input-vettor" style={{ fontSize: 12, height: 34 }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAdd} disabled={loading || !nome.trim()} className="btn btn-primary btn-sm">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar
            </button>
            <button onClick={() => { setOpen(false); setNome('') }} className="btn btn-ghost btn-sm"><X size={13} /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Seção de Pilares ──────────────────────────────────────────
function PilaresSection({ pilares, onRefresh }: { pilares: Props['pilares']; onRefresh: () => void }) {
  const supabase = createClient()

  async function addPilar(nome: string) {
    const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
    await supabase.from('pillars').insert({ nome, slug, ordem: pilares.length + 1 })
    onRefresh()
  }

  async function savePilar(id: string, nome: string) {
    await supabase.from('pillars').update({ nome }).eq('id', id)
    onRefresh()
  }

  async function deletePilar(id: string) {
    if (!confirm('Excluir este pilar? Os entregáveis vinculados também serão removidos.')) return
    await supabase.from('pillars').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Cpu size={14} style={{ color: 'var(--violet-2)' }} />
        <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>Pilares de atuação</h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--lilac)', marginBottom: 8 }}>
        Os pilares organizam os entregáveis e as permissões dos colaboradores.
      </p>
      {pilares.map(p => (
        <InlineEditItem
          key={p.id} id={p.id} nome={p.nome} descricao={null}
          onSave={async (id, nome) => { await savePilar(id, nome) }}
          onDelete={deletePilar}
          extra={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--violet-2)' }}>
              {PILAR_ICONS[p.slug] || <Package size={14} />}
            </div>
          }
        />
      ))}
      <QuickAdd placeholder="Adicionar pilar" onAdd={async (nome) => addPilar(nome)} />
    </div>
  )
}

// ── Seção de Entregáveis ───────────────────────────────────────
function EntregaveisSection({ entregaveis, pilares, onRefresh }: { entregaveis: Props['entregaveis']; pilares: Props['pilares']; onRefresh: () => void }) {
  const supabase = createClient()
  const [expandedPilar, setExpandedPilar] = useState<string | null>(null)

  const byPilar = pilares.map(p => ({
    ...p,
    itens: entregaveis.filter(e => e.pillar_id === p.id),
  }))

  async function addEntregavel(nome: string, extra: Record<string, string>) {
    if (!extra.pillar_id) return
    await supabase.from('deliverables').insert({ nome, pillar_id: extra.pillar_id, descricao: extra.descricao || null, ordem: 0 })
    onRefresh()
  }

  async function saveEntregavel(id: string, nome: string, descricao: string) {
    await supabase.from('deliverables').update({ nome, descricao: descricao || null }).eq('id', id)
    onRefresh()
  }

  async function deleteEntregavel(id: string) {
    if (!confirm('Excluir este entregável?')) return
    await supabase.from('deliverables').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Package size={14} style={{ color: 'var(--violet-2)' }} />
        <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>Entregáveis por pilar</h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--lilac)', marginBottom: 4 }}>
        Configure os entregáveis de cada pilar. Serão vinculados a cada cliente conforme o plano contratado.
      </p>

      {byPilar.map(pilar => (
        <div key={pilar.id} style={{ borderRadius: 10, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <button
            onClick={() => setExpandedPilar(expandedPilar === pilar.id ? null : pilar.id)}
            style={{
              width: '100%', padding: '12px 16px', background: 'rgba(19,8,35,0.6)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ color: 'var(--violet-2)' }}>{PILAR_ICONS[pilar.slug] || <Package size={15} />}</span>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: 'var(--cream)', flex: 1, textAlign: 'left' }}>
              {pilar.nome}
            </span>
            <span className="badge badge-violet" style={{ fontSize: 10 }}>{pilar.itens.length} entregáveis</span>
            {expandedPilar === pilar.id ? <ChevronDown size={14} style={{ color: 'var(--lilac)' }} /> : <ChevronRight size={14} style={{ color: 'var(--lilac)' }} />}
          </button>

          {expandedPilar === pilar.id && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(10,4,19,0.3)' }}>
              {pilar.itens.map(e => (
                <InlineEditItem
                  key={e.id} id={e.id} nome={e.nome} descricao={e.descricao}
                  onSave={saveEntregavel}
                  onDelete={deleteEntregavel}
                />
              ))}
              <QuickAdd
                placeholder="Adicionar entregável"
                onAdd={(nome, extra) => addEntregavel(nome, { ...extra, pillar_id: pilar.id })}
                extraFields={[{ key: 'descricao', label: 'Descrição (opcional)' }]}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Seção de Planos ────────────────────────────────────────────
function PlanosSection({ planos, onRefresh }: { planos: Plan[]; onRefresh: () => void }) {
  const supabase = createClient()

  async function addPlano(nome: string, extra: Record<string, string>) {
    await supabase.from('plans').insert({ nome, descricao: extra.descricao || null, ordem: planos.length + 1 })
    onRefresh()
  }

  async function savePlano(id: string, nome: string, descricao: string) {
    await supabase.from('plans').update({ nome, descricao: descricao || null }).eq('id', id)
    onRefresh()
  }

  async function deletePlano(id: string) {
    if (!confirm('Excluir este plano?')) return
    await supabase.from('plans').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <CreditCard size={14} style={{ color: 'var(--amber)' }} />
        <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>Planos contratáveis</h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--lilac)', marginBottom: 8 }}>
        Tiers de contratação (ex: Saturno, Falcon, Apollo). Valores são definidos no contrato do cliente.
      </p>
      {planos.map(p => (
        <InlineEditItem
          key={p.id} id={p.id} nome={p.nome} descricao={p.descricao}
          onSave={savePlano}
          onDelete={deletePlano}
        />
      ))}
      <QuickAdd
        placeholder="Adicionar plano"
        onAdd={addPlano}
        extraFields={[{ key: 'descricao', label: 'Descrição do plano' }]}
      />
    </div>
  )
}

// ── Seção de Etapas de Onboarding ─────────────────────────────
function OnboardingSection({ etapas, onRefresh }: { etapas: OnboardingStep[]; onRefresh: () => void }) {
  const supabase = createClient()

  async function addEtapa(nome: string, extra: Record<string, string>) {
    await supabase.from('onboarding_steps').insert({ nome, descricao: extra.descricao || null, ordem: etapas.length + 1 })
    onRefresh()
  }

  async function saveEtapa(id: string, nome: string, descricao: string) {
    await supabase.from('onboarding_steps').update({ nome, descricao: descricao || null }).eq('id', id)
    onRefresh()
  }

  async function deleteEtapa(id: string) {
    if (!confirm('Excluir esta etapa?')) return
    await supabase.from('onboarding_steps').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ListOrdered size={14} style={{ color: 'var(--violet-2)' }} />
        <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>Esteira de onboarding</h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--lilac)', marginBottom: 8 }}>
        Etapas do processo de onboarding da VETTOR 28. A ordem define a sequência exibida no Mapa de Entregas.
      </p>
      {etapas.map((e, idx) => (
        <InlineEditItem
          key={e.id} id={e.id} nome={e.nome} descricao={e.descricao}
          onSave={saveEtapa}
          onDelete={deleteEtapa}
          extra={
            <span style={{ fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--lilac)', minWidth: 24, textAlign: 'center' }}>
              #{idx + 1}
            </span>
          }
        />
      ))}
      <QuickAdd
        placeholder="Adicionar etapa"
        onAdd={addEtapa}
        extraFields={[{ key: 'descricao', label: 'Descrição da etapa' }]}
      />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function ConfiguracoesClient({ pilares, entregaveis, planos, etapas }: Props) {
  const [activeTab, setActiveTab] = useState<ConfigTab>('pilares')
  const router = useRouter()

  function refresh() { router.refresh() }

  return (
    <div>
      <div className="animate-fade-in-up" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Settings size={22} style={{ color: 'var(--violet-2)' }} />
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)' }}>
            Configurações
          </h1>
        </div>
        <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
          Gerencie pilares, entregáveis, planos e etapas de onboarding. Tudo configurável sem precisar de código.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Menu lateral */}
        <div className="glass animate-fade-in-up" style={{ padding: '8px' }}>
          {CONFIG_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 2,
                fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                background: activeTab === tab.id ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: activeTab === tab.id ? 'var(--violet-2)' : 'var(--lilac)',
                transition: 'all 0.15s',
                borderLeft: activeTab === tab.id ? '2px solid var(--violet)' : '2px solid transparent',
                textAlign: 'left',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="glass animate-fade-in-up delay-100" style={{ padding: '24px 28px' }}>
          {activeTab === 'pilares'     && <PilaresSection pilares={pilares} onRefresh={refresh} />}
          {activeTab === 'entregaveis' && <EntregaveisSection entregaveis={entregaveis} pilares={pilares} onRefresh={refresh} />}
          {activeTab === 'planos'      && <PlanosSection planos={planos} onRefresh={refresh} />}
          {activeTab === 'onboarding'  && <OnboardingSection etapas={etapas} onRefresh={refresh} />}
        </div>
      </div>
    </div>
  )
}
