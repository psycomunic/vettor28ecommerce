'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Trash2, Loader2, Send, Phone, Mail, Users,
  MessageSquare, Flame, ArrowRightCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

export interface Lead {
  id: string; nome: string; empresa: string | null; email: string | null; telefone: string | null; whatsapp: string | null
  origem: string | null; segmento: string | null; valor: number; stage: string; temperatura: string
  responsavel_id: string | null; proxima_acao: string | null; proxima_acao_data: string | null
  observacoes: string | null; motivo_perda: string | null; client_id: string | null; created_at: string
  responsavel?: { id: string; nome: string }
}
interface Activity { id: string; lead_id: string; autor_id: string | null; tipo: string; conteudo: string; created_at: string; autor?: { id: string; nome: string } }
interface Profile { id: string; nome: string }

const STAGES: { key: string; label: string }[] = [
  { key: 'novo', label: 'Lead novo' }, { key: 'contato', label: 'Em contato' }, { key: 'qualificado', label: 'Qualificado' },
  { key: 'proposta', label: 'Proposta enviada' }, { key: 'negociacao', label: 'Negociação' }, { key: 'ganho', label: 'Ganho' }, { key: 'perdido', label: 'Perdido' },
]
const TEMPS: { key: string; label: string; color: string }[] = [
  { key: 'frio', label: 'Frio', color: '#38BDF8' }, { key: 'morno', label: 'Morno', color: '#F5A623' }, { key: 'quente', label: 'Quente', color: '#F87171' },
]
const ORIGENS = ['Indicação', 'Meta Ads', 'Google Ads', 'Tráfego Pago', 'Site', 'Instagram', 'Outbound', 'Evento', 'Outro']
const ACT_TYPES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'nota', label: 'Nota', icon: <MessageSquare size={13} /> },
  { key: 'ligacao', label: 'Ligação', icon: <Phone size={13} /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={13} /> },
  { key: 'email', label: 'E-mail', icon: <Mail size={13} /> },
  { key: 'reuniao', label: 'Reunião', icon: <Users size={13} /> },
]
const fmtBRL = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
function timeAgo(iso: string) { const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return 'agora'; if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return new Date(iso).toLocaleDateString('pt-BR') }
function lbl(c: React.ReactNode) { return <div style={{ fontSize: 10.5, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{c}</div> }

export function LeadDetailModal({ lead, profiles, onClose, onChanged }: { lead: Lead; profiles: Profile[]; onClose: () => void; onChanged: () => void }) {
  const supabase = createClient()
  const { profile: me } = useUser()
  const [f, setF] = useState({
    nome: lead.nome, empresa: lead.empresa || '', email: lead.email || '', telefone: lead.telefone || '', whatsapp: lead.whatsapp || '',
    origem: lead.origem || '', segmento: lead.segmento || '', valor: String(lead.valor ?? 0), stage: lead.stage, temperatura: lead.temperatura,
    responsavel_id: lead.responsavel_id || '', proxima_acao: lead.proxima_acao || '', proxima_acao_data: lead.proxima_acao_data || '',
    observacoes: lead.observacoes || '', motivo_perda: lead.motivo_perda || '',
  })
  const [dirty, setDirty] = useState(false)
  const [acts, setActs] = useState<Activity[]>([])
  const [actType, setActType] = useState('nota')
  const [actText, setActText] = useState('')
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('lead_activities').select('*, autor:profiles(id,nome)').eq('lead_id', lead.id).order('created_at', { ascending: false })
    setActs((data as Activity[]) || [])
  }, [lead.id, supabase])
  useEffect(() => { load() }, [load])

  function set(k: string, v: string) { setF(p => ({ ...p, [k]: v })) }
  async function patch(fields: Record<string, any>) { setDirty(true); try { await supabase.from('leads').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', lead.id) } catch {} }
  function close() { if (dirty) onChanged(); onClose() }

  async function addActivity() {
    const t = actText.trim(); if (!t) return
    setSending(true)
    const { data } = await supabase.from('lead_activities').insert({ lead_id: lead.id, autor_id: me?.id || null, tipo: actType, conteudo: t }).select('*, autor:profiles(id,nome)').single()
    if (data) setActs(p => [data as Activity, ...p])
    setActText(''); setSending(false)
  }
  async function handleDelete() {
    if (!confirm('Excluir este lead e seu histórico?')) return
    try { await supabase.from('leads').delete().eq('id', lead.id) } catch {}
    onChanged(); onClose()
  }
  async function convertToClient() {
    if (!confirm(`Converter "${f.empresa || f.nome}" em cliente ativo?`)) return
    setConverting(true)
    try {
      const { data: cli } = await supabase.from('clients').insert({
        nome_empresa: f.empresa || f.nome, segmento: f.segmento || null, ativo: true,
        contato_nome: f.nome || null, contato_email: f.email || null, contato_whatsapp: f.whatsapp || f.telefone || null,
      }).select().single()
      await supabase.from('leads').update({ stage: 'ganho', client_id: cli?.id || null, updated_at: new Date().toISOString() }).eq('id', lead.id)
    } catch {}
    setConverting(false); onChanged(); onClose()
  }

  const temp = TEMPS.find(t => t.key === f.temperatura)!

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="animate-fade-in-up" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: 'var(--ink-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: `${temp.color}22`, color: temp.color, fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 700 }}><Flame size={12} /> {temp.label}</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{fmtBRL(Number(f.valor) || 0)}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {f.stage !== 'ganho' && (
              <button onClick={convertToClient} disabled={converting} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                {converting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />} Converter em cliente
              </button>
            )}
            <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#F87171' }}><Trash2 size={16} /></button>
            <button onClick={close} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><X size={18} /></button>
          </div>
        </div>

        {/* Nome / empresa */}
        <div style={{ padding: '18px 20px 6px' }}>
          <input value={f.empresa} onChange={e => set('empresa', e.target.value)} onBlur={() => patch({ empresa: f.empresa || null })} placeholder="Empresa"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--cream)', fontFamily: 'var(--font-title)', fontSize: 22, lineHeight: 1.2 }} />
          <input value={f.nome} onChange={e => set('nome', e.target.value)} onBlur={() => f.nome.trim() && patch({ nome: f.nome.trim() })} placeholder="Nome do contato"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--lilac)', fontFamily: 'var(--font-body)', fontSize: 14, marginTop: 2 }} />
        </div>

        {/* Propriedades */}
        <div style={{ padding: '10px 20px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <div>{lbl('Etapa')}<select className="input-vettor" style={{ height: 36, fontSize: 13, cursor: 'pointer' }} value={f.stage} onChange={e => { set('stage', e.target.value); patch({ stage: e.target.value }) }}>{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
          <div>{lbl('Valor (R$)')}<input type="number" className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.valor} onChange={e => set('valor', e.target.value)} onBlur={() => patch({ valor: Number(f.valor) || 0 })} /></div>
          <div>{lbl('Temperatura')}<select className="input-vettor" style={{ height: 36, fontSize: 13, cursor: 'pointer', color: temp.color, fontWeight: 600 }} value={f.temperatura} onChange={e => { set('temperatura', e.target.value); patch({ temperatura: e.target.value }) }}>{TEMPS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
          <div>{lbl('Responsável')}<select className="input-vettor" style={{ height: 36, fontSize: 13, cursor: 'pointer' }} value={f.responsavel_id} onChange={e => { set('responsavel_id', e.target.value); patch({ responsavel_id: e.target.value || null }) }}><option value="">Ninguém</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div>{lbl('Origem')}<select className="input-vettor" style={{ height: 36, fontSize: 13, cursor: 'pointer' }} value={f.origem} onChange={e => { set('origem', e.target.value); patch({ origem: e.target.value || null }) }}><option value="">—</option>{ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
          <div>{lbl('Segmento')}<input className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.segmento} onChange={e => set('segmento', e.target.value)} onBlur={() => patch({ segmento: f.segmento || null })} /></div>
          <div>{lbl('E-mail')}<input className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.email} onChange={e => set('email', e.target.value)} onBlur={() => patch({ email: f.email || null })} /></div>
          <div>{lbl('WhatsApp')}<input className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.whatsapp} onChange={e => set('whatsapp', e.target.value)} onBlur={() => patch({ whatsapp: f.whatsapp || null })} /></div>
          <div>{lbl('Próxima ação')}<input className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.proxima_acao} onChange={e => set('proxima_acao', e.target.value)} onBlur={() => patch({ proxima_acao: f.proxima_acao || null })} placeholder="Ex.: Enviar proposta" /></div>
          <div>{lbl('Data da ação')}<input type="date" className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.proxima_acao_data} onChange={e => { set('proxima_acao_data', e.target.value); patch({ proxima_acao_data: e.target.value || null }) }} /></div>
          {f.stage === 'perdido' && <div style={{ gridColumn: '1 / -1' }}>{lbl('Motivo da perda')}<input className="input-vettor" style={{ height: 36, fontSize: 13 }} value={f.motivo_perda} onChange={e => set('motivo_perda', e.target.value)} onBlur={() => patch({ motivo_perda: f.motivo_perda || null })} placeholder="Por que perdemos?" /></div>}
        </div>

        {/* Atividades */}
        <div style={{ padding: '16px 20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MessageSquare size={16} style={{ color: 'var(--violet-2)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>Histórico & atividades</span>
            {acts.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>{acts.length}</span>}
          </div>

          {/* Composer */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {ACT_TYPES.map(a => (
                <button key={a.key} onClick={() => setActType(a.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 99, fontSize: 12, fontFamily: 'var(--font-data)', cursor: 'pointer',
                  background: actType === a.key ? 'linear-gradient(135deg, var(--violet), var(--violet-2))' : 'rgba(19,8,35,0.6)', color: actType === a.key ? '#fff' : 'var(--lilac)', border: actType === a.key ? 'none' : '1px solid var(--border-subtle)' }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea value={actText} onChange={e => setActText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addActivity() } }} placeholder="Registrar contato, nota, próximo passo…" className="input-vettor" style={{ flex: 1, minHeight: 42, resize: 'vertical', fontSize: 13.5 }} />
              <button onClick={addActivity} disabled={sending || !actText.trim()} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', gap: 6 }}>{sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {acts.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhuma atividade ainda. Registre o primeiro contato acima.</div>}
            {acts.map(a => {
              const at = ACT_TYPES.find(x => x.key === a.tipo)
              return (
                <div key={a.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'rgba(124,58,237,0.16)', color: 'var(--violet-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{at?.icon || <MessageSquare size={14} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)' }}>{at?.label || 'Nota'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{a.autor?.nome?.split(' ')[0] || ''} · {timeAgo(a.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--lilac)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.conteudo}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
