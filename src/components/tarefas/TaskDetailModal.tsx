'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Trash2, Plus, Loader2, ListChecks, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskStatus, TaskPriority, Pillar, Client, Profile } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/utils'

interface Subtask {
  id: string
  task_id: string
  titulo: string
  concluida: boolean
  ordem: number
}

interface Props {
  task: Task
  clientes: Client[]
  pilares: Pillar[]
  profiles: Profile[]
  onClose: () => void
  onChanged: () => void
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  a_fazer: '#7C3AED', fazendo: '#0EA5E9', revisao: '#F5A623', concluido: '#10B981',
}
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  baixa: 'var(--lilac)', media: 'var(--violet-2)', alta: 'var(--amber)', urgente: '#F87171',
}

function fieldLabel(children: React.ReactNode) {
  return <div style={{ fontSize: 10.5, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{children}</div>
}

export function TaskDetailModal({ task, clientes, pilares, profiles, onClose, onChanged }: Props) {
  const supabase = createClient()
  const [titulo, setTitulo] = useState(task.titulo)
  const [descricao, setDescricao] = useState(task.descricao || '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [prioridade, setPrioridade] = useState<TaskPriority>(task.prioridade)
  const [clientId, setClientId] = useState(task.client_id || '')
  const [pillarId, setPillarId] = useState(task.pillar_id || '')
  const [responsavelId, setResponsavelId] = useState(task.responsavel_id || '')
  const [prazo, setPrazo] = useState(task.prazo ? task.prazo.slice(0, 10) : '')
  const [dirty, setDirty] = useState(false)

  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subLoading, setSubLoading] = useState(true)
  const [subError, setSubError] = useState(false)
  const [novaSub, setNovaSub] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Carrega subtarefas ───────────────────────────────────
  const loadSubtasks = useCallback(async () => {
    setSubLoading(true)
    const { data, error } = await supabase
      .from('subtasks').select('*').eq('task_id', task.id).order('ordem', { ascending: true })
    if (error) { setSubError(true); setSubtasks([]) }
    else { setSubError(false); setSubtasks((data as Subtask[]) || []) }
    setSubLoading(false)
  }, [task.id, supabase])

  useEffect(() => { loadSubtasks() }, [loadSubtasks])

  // ── Persiste campos da tarefa ────────────────────────────
  async function patch(fields: Record<string, any>) {
    setDirty(true)
    try { await supabase.from('tasks').update(fields).eq('id', task.id) } catch {}
  }

  function close() {
    if (dirty) onChanged()
    onClose()
  }

  async function handleDelete() {
    if (!confirm('Excluir esta tarefa e suas subtarefas?')) return
    setDeleting(true)
    try { await supabase.from('tasks').delete().eq('id', task.id) } catch {}
    onChanged()
    onClose()
  }

  // ── Subtarefas: CRUD ─────────────────────────────────────
  async function addSubtask() {
    const t = novaSub.trim()
    if (!t) return
    setAddingSub(true)
    const { data, error } = await supabase
      .from('subtasks')
      .insert({ task_id: task.id, titulo: t, ordem: subtasks.length })
      .select().single()
    if (!error && data) setSubtasks(prev => [...prev, data as Subtask])
    else if (error) setSubError(true)
    setNovaSub('')
    setAddingSub(false)
  }

  async function toggleSubtask(s: Subtask) {
    setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, concluida: !x.concluida } : x))
    try { await supabase.from('subtasks').update({ concluida: !s.concluida }).eq('id', s.id) } catch {}
  }

  async function delSubtask(id: string) {
    setSubtasks(prev => prev.filter(x => x.id !== id))
    try { await supabase.from('subtasks').delete().eq('id', id) } catch {}
  }

  const done = subtasks.filter(s => s.concluida).length
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
    >
      <div
        className="animate-fade-in-up"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 720, background: 'var(--ink-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status], fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[status] }} />
            {TASK_STATUS_LABELS[status]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-data)' }}>Tarefa</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#F87171' }} title="Excluir tarefa">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
            <button onClick={close} className="btn btn-ghost btn-sm" style={{ padding: 8 }} title="Fechar"><X size={18} /></button>
          </div>
        </div>

        {/* Título */}
        <div style={{ padding: '18px 20px 4px' }}>
          <textarea
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onBlur={() => titulo.trim() && titulo !== task.titulo && patch({ titulo: titulo.trim() })}
            rows={1}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--cream)', fontFamily: 'var(--font-title)', fontSize: 22, letterSpacing: '0.01em', lineHeight: 1.3 }}
            placeholder="Título da tarefa"
          />
        </div>

        {/* Propriedades */}
        <div style={{ padding: '8px 20px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            {fieldLabel('Status')}
            <select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={status}
              onChange={e => { const v = e.target.value as TaskStatus; setStatus(v); patch({ status: v }) }}>
              {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            {fieldLabel('Prioridade')}
            <select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13, color: PRIORITY_COLOR[prioridade], fontWeight: 600 }} value={prioridade}
              onChange={e => { const v = e.target.value as TaskPriority; setPrioridade(v); patch({ prioridade: v }) }}>
              {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            {fieldLabel('Responsável')}
            <select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={responsavelId}
              onChange={e => { setResponsavelId(e.target.value); patch({ responsavel_id: e.target.value || null }) }}>
              <option value="">Ninguém</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            {fieldLabel('Cliente')}
            <select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={clientId}
              onChange={e => { setClientId(e.target.value); patch({ client_id: e.target.value || null }) }}>
              <option value="">Sem cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
            </select>
          </div>
          <div>
            {fieldLabel('Pilar')}
            <select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={pillarId}
              onChange={e => { setPillarId(e.target.value); patch({ pillar_id: e.target.value || null }) }}>
              <option value="">Sem pilar</option>
              {pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            {fieldLabel('Prazo')}
            <input type="date" className="input-vettor" style={{ height: 36, fontSize: 13 }} value={prazo}
              onChange={e => { setPrazo(e.target.value); patch({ prazo: e.target.value || null }) }} />
          </div>
        </div>

        {/* Descrição */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          {fieldLabel('Descrição')}
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            onBlur={() => descricao !== (task.descricao || '') && patch({ descricao: descricao || null })}
            placeholder="Adicione detalhes, contexto, links..."
            className="input-vettor"
            style={{ minHeight: 80, resize: 'vertical', fontSize: 13.5, lineHeight: 1.5 }}
          />
        </div>

        {/* Subtarefas */}
        <div style={{ padding: '16px 20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ListChecks size={16} style={{ color: 'var(--violet-2)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>Subtarefas</span>
            {subtasks.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>{done}/{subtasks.length}</span>
            )}
            {subtasks.length > 0 && (
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(174,150,214,0.12)', overflow: 'hidden', maxWidth: 220, marginLeft: 'auto' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--violet), var(--violet-2))', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>

          {subError ? (
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', fontSize: 12.5, color: 'var(--warning)' }}>
              As subtarefas precisam da tabela <code>subtasks</code> no banco. Rode o SQL em <code>supabase/subtasks_migration.sql</code> no SQL Editor do Supabase para ativar.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {subLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={14} className="animate-spin" /> Carregando...</div>
                ) : subtasks.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '6px 0' }}>Nenhuma subtarefa ainda. Adicione abaixo. 👇</div>
                ) : subtasks.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(19,8,35,0.5)', border: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => toggleSubtask(s)} style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                      border: s.concluida ? 'none' : '1.5px solid var(--border-strong)',
                      background: s.concluida ? 'var(--success)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} aria-label="Concluir subtarefa">
                      {s.concluida && <Check size={12} color="#0A0413" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: s.concluida ? 'var(--text-dim)' : 'var(--cream)', textDecoration: s.concluida ? 'line-through' : 'none' }}>{s.titulo}</span>
                    <button onClick={() => delSubtask(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 3, display: 'flex' }} aria-label="Remover subtarefa">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={novaSub}
                  onChange={e => setNovaSub(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
                  placeholder="+ Adicionar subtarefa e pressionar Enter"
                  className="input-vettor"
                  style={{ flex: 1, height: 38, fontSize: 13 }}
                />
                <button onClick={addSubtask} disabled={addingSub || !novaSub.trim()} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                  {addingSub ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
