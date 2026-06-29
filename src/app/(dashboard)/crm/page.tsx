'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragEndEvent, DragOverEvent, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, Loader2, Search, Calendar, TrendingUp, Target, DollarSign, Percent, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { LeadDetailModal, Lead } from '@/components/crm/LeadDetailModal'

interface Profile { id: string; nome: string }

const STAGES = [
  { key: 'novo',        label: 'Lead novo',        color: '#7C3AED' },
  { key: 'contato',     label: 'Em contato',       color: '#38BDF8' },
  { key: 'qualificado', label: 'Qualificado',      color: '#A855F7' },
  { key: 'proposta',    label: 'Proposta enviada', color: '#F5A623' },
  { key: 'negociacao',  label: 'Negociação',       color: '#EC4899' },
  { key: 'ganho',       label: 'Ganho',            color: '#10B981' },
  { key: 'perdido',     label: 'Perdido',          color: '#F87171' },
]
const TEMP_COLOR: Record<string, string> = { frio: '#38BDF8', morno: '#F5A623', quente: '#F87171' }
const ORIGENS = ['Indicação', 'Meta Ads', 'Google Ads', 'Tráfego Pago', 'Site', 'Instagram', 'Outbound', 'Evento', 'Outro']
const fmtBRL = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
function daysSince(iso: string) { return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) }

function LeadCard({ lead, overlay = false }: { lead: Lead; overlay?: boolean }) {
  const d = daysSince(lead.created_at)
  return (
    <div style={{ background: overlay ? 'rgba(38,21,80,0.95)' : 'rgba(28,15,53,0.8)', border: `1px solid ${overlay ? 'var(--violet)' : 'var(--border-subtle)'}`, borderRadius: 10, padding: 13, boxShadow: overlay ? 'var(--shadow-glow)' : 'var(--shadow-sm)', transform: overlay ? 'rotate(2deg)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEMP_COLOR[lead.temperatura] || '#F5A623', marginTop: 5, flexShrink: 0 }} title={lead.temperatura} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--cream)', fontWeight: 600, lineHeight: 1.3 }}>{lead.empresa || lead.nome}</div>
          {lead.empresa && <div style={{ fontSize: 11.5, color: 'var(--lilac)' }}>{lead.nome}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{fmtBRL(lead.valor)}</span>
        {lead.origem && <span className="badge badge-gray" style={{ fontSize: 9 }}>{lead.origem}</span>}
      </div>
      {(lead.proxima_acao || lead.responsavel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
          {lead.proxima_acao && <span style={{ fontSize: 11, color: 'var(--lilac)', display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}><Calendar size={11} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.proxima_acao}</span></span>}
          {lead.responsavel && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--violet), var(--violet-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', marginLeft: 'auto', flexShrink: 0 }}>{getInitials(lead.responsavel.nome)}</div>}
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>{d === 0 ? 'hoje' : `há ${d}d no funil`}</div>
    </div>
  )
}

function SortableLead({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }} {...attributes} {...listeners} onClick={() => { if (!isDragging) onOpen(lead) }}>
      <LeadCard lead={lead} />
    </div>
  )
}

function Column({ stage, leads, onAdd, onOpen }: { stage: typeof STAGES[0]; leads: Lead[]; onAdd: (s: string) => void; onOpen: (l: Lead) => void }) {
  const total = leads.reduce((a, l) => a + (Number(l.valor) || 0), 0)
  return (
    <div style={{ flex: '1 1 0', minWidth: 240, maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '10px 12px', borderRadius: 10, background: `${stage.color}18`, border: `1px solid ${stage.color}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 12.5, fontWeight: 600, color: 'var(--cream)' }}>{stage.label}</span>
            <span style={{ background: `${stage.color}30`, color: stage.color, borderRadius: 99, padding: '1px 7px', fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 700 }}>{leads.length}</span>
          </div>
          <button onClick={() => onAdd(stage.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lilac)', padding: 2, display: 'flex' }}><Plus size={15} /></button>
        </div>
        <div style={{ fontSize: 11, color: stage.color, fontFamily: 'var(--font-data)', fontWeight: 600, marginTop: 4 }}>{fmtBRL(total)}</div>
      </div>
      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
          {leads.map(l => <SortableLead key={l.id} lead={l} onOpen={onOpen} />)}
        </div>
      </SortableContext>
    </div>
  )
}

function NovoLeadModal({ initialStage, profiles, onClose, onSaved }: { initialStage: string; profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nome: '', empresa: '', valor: '', origem: '', temperatura: 'morno', responsavel_id: '', telefone: '', email: '', stage: initialStage })
  const [loading, setLoading] = useState(false)
  function set(k: string, v: string) { setF(p => ({ ...p, [k]: v })) }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!f.nome && !f.empresa) return
    setLoading(true)
    try { await createClient().from('leads').insert({ nome: f.nome || f.empresa, empresa: f.empresa || null, valor: Number(f.valor) || 0, origem: f.origem || null, temperatura: f.temperatura, responsavel_id: f.responsavel_id || null, telefone: f.telefone || null, email: f.email || null, stage: f.stage }) } catch {}
    onSaved(); setLoading(false)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="panel animate-fade-in-up" style={{ width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--cream)' }}>Novo Lead</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={f.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Empresa" className="input-vettor" />
          <input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do contato *" className="input-vettor" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input type="number" value={f.valor} onChange={e => set('valor', e.target.value)} placeholder="Valor (R$)" className="input-vettor" />
            <select value={f.temperatura} onChange={e => set('temperatura', e.target.value)} className="input-vettor" style={{ cursor: 'pointer' }}><option value="frio">Frio</option><option value="morno">Morno</option><option value="quente">Quente</option></select>
            <select value={f.origem} onChange={e => set('origem', e.target.value)} className="input-vettor" style={{ cursor: 'pointer' }}><option value="">Origem...</option>{ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}</select>
            <select value={f.responsavel_id} onChange={e => set('responsavel_id', e.target.value)} className="input-vettor" style={{ cursor: 'pointer' }}><option value="">Responsável...</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <input value={f.telefone} onChange={e => set('telefone', e.target.value)} placeholder="Telefone/WhatsApp" className="input-vettor" />
            <input value={f.email} onChange={e => set('email', e.target.value)} placeholder="E-mail" className="input-vettor" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Criar lead</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [active, setActive] = useState<Lead | null>(null)
  const [detail, setDetail] = useState<Lead | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newStage, setNewStage] = useState('novo')
  const [search, setSearch] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [lRes, pRes] = await Promise.all([
      supabase.from('leads').select('*, responsavel:profiles(id,nome)').order('ordem'),
      supabase.from('profiles').select('id, nome').order('nome'),
    ])
    if (lRes.error) setTableError(true); else setLeads((lRes.data as Lead[]) || [])
    setProfiles((pRes.data as Profile[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const filtered = leads.filter(l => !search || (l.empresa || '').toLowerCase().includes(search.toLowerCase()) || l.nome.toLowerCase().includes(search.toLowerCase()))
  const colLeads = (s: string) => filtered.filter(l => l.stage === s)

  function handleDragStart(e: DragStartEvent) { setActive(leads.find(l => l.id === e.active.id) || null) }
  async function handleDragEnd(e: DragEndEvent) {
    const { active: a, over } = e; setActive(null); if (!over) return
    const lead = leads.find(l => l.id === a.id); if (!lead) return
    const overStage = STAGES.find(s => s.key === over.id)?.key || leads.find(l => l.id === over.id)?.stage
    if (overStage && overStage !== lead.stage) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: overStage } : l))
      try { await createClient().from('leads').update({ stage: overStage, updated_at: new Date().toISOString() }).eq('id', lead.id) } catch {}
    }
  }
  function handleDragOver(e: DragOverEvent) {
    const { active: a, over } = e; if (!over) return
    const overStage = STAGES.find(s => s.key === over.id)?.key
    if (overStage) { const lead = leads.find(l => l.id === a.id); if (lead && lead.stage !== overStage) setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: overStage } : l)) }
  }

  // Métricas do funil
  const ativos = leads.filter(l => l.stage !== 'ganho' && l.stage !== 'perdido')
  const pipeline = ativos.reduce((a, l) => a + (Number(l.valor) || 0), 0)
  const ganhos = leads.filter(l => l.stage === 'ganho')
  const valorGanho = ganhos.reduce((a, l) => a + (Number(l.valor) || 0), 0)
  const perdidos = leads.filter(l => l.stage === 'perdido').length
  const conversao = (ganhos.length + perdidos) > 0 ? Math.round((ganhos.length / (ganhos.length + perdidos)) * 100) : 0

  const metrics = [
    { label: 'Leads no funil', value: String(ativos.length), icon: <Users size={16} />, color: 'var(--violet)' },
    { label: 'Valor no pipeline', value: fmtBRL(pipeline), icon: <DollarSign size={16} />, color: '#38BDF8' },
    { label: 'Ganho', value: fmtBRL(valorGanho), icon: <TrendingUp size={16} />, color: '#10B981' },
    { label: 'Conversão', value: `${conversao}%`, icon: <Percent size={16} />, color: 'var(--amber)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px - 48px)' }}>
      <div className="animate-fade-in-up" style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)', marginBottom: 4 }}>CRM de Vendas</h1>
          <p style={{ color: 'var(--lilac)', fontSize: 14 }}>Funil de leads e oportunidades da agência.</p>
        </div>
        <button onClick={() => { setNewStage('novo'); setShowNew(true) }} className="btn btn-primary"><Plus size={16} /> Novo Lead</button>
      </div>

      {/* Métricas */}
      <div className="animate-fade-in-up delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {metrics.map(m => (
          <div key={m.label} className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.color}1f`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.icon}</div>
            <div><div style={{ fontFamily: 'var(--font-data)', fontSize: 18, fontWeight: 700, color: 'var(--cream)' }}>{m.value}</div><div style={{ fontSize: 11.5, color: 'var(--lilac)' }}>{m.label}</div></div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="panel animate-fade-in-up delay-100" style={{ display: 'flex', gap: 10, padding: '10px 12px', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lead..." className="input-vettor" style={{ paddingLeft: 34, height: 36, fontSize: 13 }} />
        </div>
      </div>

      {tableError ? (
        <div className="panel" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <Target size={36} style={{ color: 'var(--lilac)', opacity: 0.4, margin: '0 auto 14px' }} />
          <h3 style={{ fontFamily: 'var(--font-data)', fontSize: 16, color: 'var(--cream)', marginBottom: 8 }}>Ative o CRM</h3>
          <p style={{ fontSize: 13, color: 'var(--lilac)', maxWidth: 380, margin: '0 auto' }}>Rode o arquivo <strong>crm_leads_migration.sql</strong> no SQL Editor do Supabase para criar as tabelas do funil de vendas.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, color: 'var(--lilac)' }}><Loader2 size={22} className="animate-spin" /> Carregando...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
          <div style={{ display: 'flex', gap: 12, flex: 1, overflowX: 'auto', overflowY: 'auto', paddingBottom: 8 }}>
            {STAGES.map(s => <Column key={s.key} stage={s} leads={colLeads(s.key)} onAdd={(st) => { setNewStage(st); setShowNew(true) }} onOpen={setDetail} />)}
          </div>
          <DragOverlay>{active && <LeadCard lead={active} overlay />}</DragOverlay>
        </DndContext>
      )}

      {showNew && <NovoLeadModal initialStage={newStage} profiles={profiles} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); fetchData() }} />}
      {detail && <LeadDetailModal lead={detail} profiles={profiles} onClose={() => setDetail(null)} onChanged={fetchData} />}
    </div>
  )
}
