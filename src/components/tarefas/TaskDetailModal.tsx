'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Trash2, Plus, Loader2, ListChecks, Check, MessageSquare,
  Paperclip, Send, Download, FileText, Image as ImageIcon, AtSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Task, TaskStatus, TaskPriority, Pillar, Client, Profile } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, getInitials } from '@/lib/utils'

interface Subtask { id: string; task_id: string; titulo: string; concluida: boolean; ordem: number }
interface CommentRow { id: string; task_id: string; autor_id: string | null; conteudo: string; mencionados: string[]; created_at: string; autor?: { id: string; nome: string } }
interface AttachmentRow { id: string; task_id: string; nome: string; url: string; path: string | null; tipo: string | null; tamanho: number | null; created_at: string }

interface Props {
  task: Task
  clientes: Client[]
  pilares: Pillar[]
  profiles: Profile[]
  onClose: () => void
  onChanged: () => void
}

const STATUS_COLOR: Record<TaskStatus, string> = { a_fazer: '#7C3AED', fazendo: '#0EA5E9', revisao: '#F5A623', concluido: '#10B981' }
const PRIORITY_COLOR: Record<TaskPriority, string> = { baixa: 'var(--lilac)', media: 'var(--violet-2)', alta: 'var(--amber)', urgente: '#F87171' }

function lbl(children: React.ReactNode) {
  return <div style={{ fontSize: 10.5, fontFamily: 'var(--font-data)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{children}</div>
}
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}
function fmtSize(b: number | null): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function avatar(nome: string, size = 26, fontSize = 11) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--violet), var(--violet-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700, color: 'white', fontFamily: 'var(--font-data)' }}>
      {getInitials(nome || '?')}
    </div>
  )
}

export function TaskDetailModal({ task, clientes, pilares, profiles, onClose, onChanged }: Props) {
  const supabase = createClient()
  const { profile: me } = useUser()

  // Campos da tarefa
  const [titulo, setTitulo] = useState(task.titulo)
  const [descricao, setDescricao] = useState(task.descricao || '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [prioridade, setPrioridade] = useState<TaskPriority>(task.prioridade)
  const [clientId, setClientId] = useState(task.client_id || '')
  const [pillarId, setPillarId] = useState(task.pillar_id || '')
  const [responsavelId, setResponsavelId] = useState(task.responsavel_id || '')
  const [prazo, setPrazo] = useState(task.prazo ? task.prazo.slice(0, 10) : '')
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Subtarefas
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subError, setSubError] = useState(false)
  const [novaSub, setNovaSub] = useState('')

  // Comentários
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentsError, setCommentsError] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [mentions, setMentions] = useState<Record<string, string>>({}) // nomeSemEspaco -> id... usamos nome completo
  const [mentionMenu, setMentionMenu] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [sending, setSending] = useState(false)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  // Anexos
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Carregamentos ────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const [subRes, comRes, attRes] = await Promise.all([
      supabase.from('subtasks').select('*').eq('task_id', task.id).order('ordem'),
      supabase.from('comments').select('*, autor:profiles(id,nome)').eq('task_id', task.id).order('created_at'),
      supabase.from('attachments').select('*').eq('task_id', task.id).order('created_at', { ascending: false }),
    ])
    if (subRes.error) setSubError(true); else setSubtasks((subRes.data as Subtask[]) || [])
    if (comRes.error) setCommentsError(true); else setComments((comRes.data as CommentRow[]) || [])
    if (!attRes.error) setAttachments((attRes.data as AttachmentRow[]) || [])
  }, [task.id, supabase])

  useEffect(() => { loadAll() }, [loadAll])

  async function patch(fields: Record<string, any>) { setDirty(true); try { await supabase.from('tasks').update(fields).eq('id', task.id) } catch {} }
  function close() { if (dirty) onChanged(); onClose() }
  async function handleDelete() {
    if (!confirm('Excluir esta tarefa, suas subtarefas, comentários e anexos?')) return
    setDeleting(true)
    try { await supabase.from('tasks').delete().eq('id', task.id) } catch {}
    onChanged(); onClose()
  }

  // ── Subtarefas ───────────────────────────────────────────
  async function addSubtask() {
    const t = novaSub.trim(); if (!t) return
    const { data, error } = await supabase.from('subtasks').insert({ task_id: task.id, titulo: t, ordem: subtasks.length }).select().single()
    if (!error && data) setSubtasks(p => [...p, data as Subtask]); else if (error) setSubError(true)
    setNovaSub('')
  }
  async function toggleSubtask(s: Subtask) {
    setSubtasks(p => p.map(x => x.id === s.id ? { ...x, concluida: !x.concluida } : x))
    try { await supabase.from('subtasks').update({ concluida: !s.concluida }).eq('id', s.id) } catch {}
  }
  async function delSubtask(id: string) { setSubtasks(p => p.filter(x => x.id !== id)); try { await supabase.from('subtasks').delete().eq('id', id) } catch {} }
  const subDone = subtasks.filter(s => s.concluida).length
  const subPct = subtasks.length ? Math.round((subDone / subtasks.length) * 100) : 0

  // ── Anexos ───────────────────────────────────────────────
  async function handleFiles(list: FileList | null) {
    if (!list || !list.length) return
    setUploading(true)
    for (const file of Array.from(list)) {
      const path = `${task.id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('task-files').upload(path, file)
      if (upErr) { setUploading(false); alert('Falha no upload. Rode a migração de anexos no Supabase.'); return }
      const { data: pub } = supabase.storage.from('task-files').getPublicUrl(path)
      const { data } = await supabase.from('attachments').insert({ task_id: task.id, autor_id: me?.id || null, nome: file.name, url: pub.publicUrl, path, tipo: file.type, tamanho: file.size }).select().single()
      if (data) setAttachments(p => [data as AttachmentRow, ...p])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }
  async function delAttachment(a: AttachmentRow) {
    setAttachments(p => p.filter(x => x.id !== a.id))
    try { if (a.path) await supabase.storage.from('task-files').remove([a.path]); await supabase.from('attachments').delete().eq('id', a.id) } catch {}
  }

  // ── Comentários + @menção ────────────────────────────────
  function onCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setCommentText(v)
    const pos = e.target.selectionStart
    const m = v.slice(0, pos).match(/@([\p{L}]*)$/u)
    if (m) { setMentionQuery(m[1].toLowerCase()); setMentionMenu(true) } else setMentionMenu(false)
  }
  function pickMention(p: Profile) {
    const ta = commentRef.current
    const pos = ta ? ta.selectionStart : commentText.length
    const before = commentText.slice(0, pos).replace(/@([\p{L}]*)$/u, `@${p.nome} `)
    const after = commentText.slice(pos)
    setCommentText(before + after)
    setMentions(prev => ({ ...prev, [p.nome]: p.id }))
    setMentionMenu(false)
    setTimeout(() => ta?.focus(), 0)
  }
  const mentionOptions = profiles.filter(p => p.nome.toLowerCase().includes(mentionQuery)).slice(0, 6)

  async function sendComment() {
    const text = commentText.trim(); if (!text || !me) return
    setSending(true)
    const mentionedIds = Object.entries(mentions).filter(([nome]) => text.includes('@' + nome)).map(([, id]) => id)
    const { data, error } = await supabase.from('comments')
      .insert({ task_id: task.id, autor_id: me.id, conteudo: text, mencionados: mentionedIds })
      .select('*, autor:profiles(id,nome)').single()
    if (error) { setCommentsError(true); setSending(false); return }
    setComments(p => [...p, data as CommentRow])
    // Notifica mencionados
    for (const uid of mentionedIds) {
      if (uid === me.id) continue
      try {
        await supabase.from('notifications').insert({
          user_id: uid, tipo: 'mencao',
          mensagem: `${me.nome.split(' ')[0]} mencionou você na tarefa "${task.titulo}"`,
          link: `/tarefas?task=${task.id}`,
        })
      } catch {}
    }
    setCommentText(''); setMentions({}); setSending(false)
  }

  function renderComment(c: CommentRow) {
    // destaca @nome dos mencionados
    const nomes = (c.mencionados || []).map(id => profiles.find(p => p.id === id)?.nome).filter(Boolean) as string[]
    if (!nomes.length) return c.conteudo
    const parts: React.ReactNode[] = []
    let rest = c.conteudo
    let key = 0
    while (rest.length) {
      const hit = nomes.map(n => ({ n, i: rest.indexOf('@' + n) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i)[0]
      if (!hit) { parts.push(rest); break }
      if (hit.i > 0) parts.push(rest.slice(0, hit.i))
      parts.push(<span key={key++} style={{ color: 'var(--violet-2)', fontWeight: 600 }}>@{hit.n}</span>)
      rest = rest.slice(hit.i + hit.n.length + 1)
    }
    return parts
  }

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="animate-fade-in-up" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: 'var(--ink-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status], fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[status] }} />
            {TASK_STATUS_LABELS[status]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-data)' }}>
            criada {timeAgo(task.created_at)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ padding: 8, color: '#F87171' }} title="Excluir tarefa">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
            <button onClick={close} className="btn btn-ghost btn-sm" style={{ padding: 8 }} title="Fechar"><X size={18} /></button>
          </div>
        </div>

        {/* Título */}
        <div style={{ padding: '18px 20px 4px' }}>
          <textarea value={titulo} onChange={e => setTitulo(e.target.value)} onBlur={() => titulo.trim() && titulo !== task.titulo && patch({ titulo: titulo.trim() })} rows={1}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--cream)', fontFamily: 'var(--font-title)', fontSize: 22, lineHeight: 1.3 }} placeholder="Título da tarefa" />
        </div>

        {/* Propriedades */}
        <div style={{ padding: '8px 20px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <div>{lbl('Status')}<select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={status} onChange={e => { const v = e.target.value as TaskStatus; setStatus(v); patch({ status: v }) }}>{Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div>{lbl('Prioridade')}<select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13, color: PRIORITY_COLOR[prioridade], fontWeight: 600 }} value={prioridade} onChange={e => { const v = e.target.value as TaskPriority; setPrioridade(v); patch({ prioridade: v }) }}>{Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div>{lbl('Responsável')}<select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={responsavelId} onChange={e => { setResponsavelId(e.target.value); patch({ responsavel_id: e.target.value || null }) }}><option value="">Ninguém</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div>{lbl('Cliente')}<select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={clientId} onChange={e => { setClientId(e.target.value); patch({ client_id: e.target.value || null }) }}><option value="">Sem cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}</select></div>
          <div>{lbl('Pilar')}<select className="input-vettor" style={{ cursor: 'pointer', height: 36, fontSize: 13 }} value={pillarId} onChange={e => { setPillarId(e.target.value); patch({ pillar_id: e.target.value || null }) }}><option value="">Sem pilar</option>{pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div>{lbl('Prazo')}<input type="date" className="input-vettor" style={{ height: 36, fontSize: 13 }} value={prazo} onChange={e => { setPrazo(e.target.value); patch({ prazo: e.target.value || null }) }} /></div>
        </div>

        {/* Descrição */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          {lbl('Descrição')}
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} onBlur={() => descricao !== (task.descricao || '') && patch({ descricao: descricao || null })} placeholder="Adicione detalhes, contexto, links..." className="input-vettor" style={{ minHeight: 70, resize: 'vertical', fontSize: 13.5, lineHeight: 1.5 }} />
        </div>

        {/* Subtarefas */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ListChecks size={16} style={{ color: 'var(--violet-2)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>Subtarefas</span>
            {subtasks.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>{subDone}/{subtasks.length}</span>}
            {subtasks.length > 0 && <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(174,150,214,0.12)', overflow: 'hidden', maxWidth: 200, marginLeft: 'auto' }}><div style={{ width: `${subPct}%`, height: '100%', background: subPct === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--violet), var(--violet-2))', transition: 'width .3s' }} /></div>}
          </div>
          {subError ? (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', fontSize: 12.5, color: 'var(--warning)' }}>Rode <code>subtasks_migration.sql</code> no Supabase para ativar as subtarefas.</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {subtasks.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(19,8,35,0.5)', border: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => toggleSubtask(s)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer', border: s.concluida ? 'none' : '1.5px solid var(--border-strong)', background: s.concluida ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.concluida && <Check size={12} color="#0A0413" strokeWidth={3} />}</button>
                    <span style={{ flex: 1, fontSize: 13, color: s.concluida ? 'var(--text-dim)' : 'var(--cream)', textDecoration: s.concluida ? 'line-through' : 'none' }}>{s.titulo}</span>
                    <button onClick={() => delSubtask(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 3, display: 'flex' }}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={novaSub} onChange={e => setNovaSub(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }} placeholder="+ Adicionar subtarefa e pressionar Enter" className="input-vettor" style={{ flex: 1, height: 38, fontSize: 13 }} />
                <button onClick={addSubtask} disabled={!novaSub.trim()} className="btn btn-primary btn-sm" style={{ gap: 6 }}><Plus size={14} /> Adicionar</button>
              </div>
            </>
          )}
        </div>

        {/* Anexos */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Paperclip size={16} style={{ color: 'var(--violet-2)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>Anexos</span>
            {attachments.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>{attachments.length}</span>}
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm" style={{ gap: 6, marginLeft: 'auto' }}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Anexar arquivo
            </button>
          </div>
          {attachments.length === 0 ? (
            <div onClick={() => fileRef.current?.click()} style={{ padding: '16px', borderRadius: 10, border: '1.5px dashed var(--border-strong)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer' }}>
              Clique para anexar qualquer arquivo (PDF, imagem, vídeo, planilha...)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachments.map(a => {
                const isImg = (a.tipo || '').startsWith('image/')
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(19,8,35,0.5)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(124,58,237,0.15)', color: 'var(--violet-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isImg ? <ImageIcon size={15} /> : <FileText size={15} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtSize(a.tamanho)}</div>
                    </div>
                    <a href={a.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: 7 }} title="Baixar"><Download size={15} /></a>
                    <button onClick={() => delAttachment(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 5, display: 'flex' }}><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Comentários */}
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MessageSquare size={16} style={{ color: 'var(--violet-2)' }} />
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>Comentários</span>
            {comments.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>{comments.length}</span>}
          </div>

          {commentsError ? (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', fontSize: 12.5, color: 'var(--warning)', marginBottom: 12 }}>Rode <code>comments_attachments_migration.sql</code> no Supabase para ativar comentários e anexos.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {comments.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum comentário ainda. Use @ para mencionar alguém.</div>}
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  {avatar(c.autor?.nome || '?', 30, 12)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)' }}>{c.autor?.nome || 'Usuário'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--lilac)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderComment(c)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Composer com @menção */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              {avatar(me?.nome || '?', 30, 12)}
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea ref={commentRef} value={commentText} onChange={onCommentChange}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendComment() } }}
                  placeholder="Escreva um comentário…  (digite @ para mencionar)" className="input-vettor" style={{ minHeight: 44, resize: 'vertical', fontSize: 13.5, lineHeight: 1.5, paddingRight: 44 }} />
                <button onClick={sendComment} disabled={sending || !commentText.trim()} style={{ position: 'absolute', right: 8, bottom: 8, background: commentText.trim() ? 'linear-gradient(135deg, var(--violet), var(--violet-2))' : 'transparent', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: commentText.trim() ? 'pointer' : 'default', color: 'white' }} title="Enviar (Ctrl+Enter)">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>

            {/* Dropdown de menção */}
            {mentionMenu && mentionOptions.length > 0 && (
              <div style={{ position: 'absolute', left: 40, bottom: 'calc(100% + 4px)', zIndex: 5, width: 260, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', fontSize: 10.5, fontFamily: 'var(--font-data)', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><AtSign size={11} /> Mencionar</div>
                {mentionOptions.map(p => (
                  <button key={p.id} onClick={() => pickMention(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.15)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {avatar(p.nome, 24, 10)}
                    <span style={{ fontSize: 13, color: 'var(--cream)' }}>{p.nome}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto', textTransform: 'capitalize' }}>{(p as any).role || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
