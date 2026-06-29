'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, Loader2, Calendar, AlertTriangle,
  GripVertical, Tag, ChevronDown, Search, Filter
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskStatus, TaskPriority, Pillar, Client, Profile } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, formatDate } from '@/lib/utils'
import { TaskDetailModal } from '@/components/tarefas/TaskDetailModal'
import { useEffect } from 'react'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  baixa:   'badge-gray',
  media:   'badge-violet',
  alta:    'badge-amber',
  urgente: 'badge-red',
}

const COLUMN_COLORS: Record<TaskStatus, string> = {
  a_fazer:  '#7C3AED',
  fazendo:  '#0EA5E9',
  revisao:  '#F5A623',
  concluido:'#10B981',
}

const COLUMNS: TaskStatus[] = ['a_fazer', 'fazendo', 'revisao', 'concluido']

// ─── Componente de card de tarefa ──────────────────────────
function TaskCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const isOverdue = task.prazo && new Date(task.prazo) < new Date() && task.status !== 'concluido'

  return (
    <div style={{
      background: overlay ? 'rgba(38,21,80,0.95)' : 'rgba(28,15,53,0.8)',
      border: `1px solid ${overlay ? 'var(--violet)' : 'var(--border-subtle)'}`,
      borderRadius: 10,
      padding: '14px',
      cursor: 'grab',
      boxShadow: overlay ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
      transform: overlay ? 'rotate(2deg)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <GripVertical size={14} style={{ color: 'var(--lilac)', opacity: 0.4, flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
          {task.titulo}
        </p>
      </div>

      {task.descricao && (
        <p style={{ fontSize: 12, color: 'var(--lilac)', marginBottom: 10, lineHeight: 1.5, paddingLeft: 22 }}>
          {task.descricao.slice(0, 80)}{task.descricao.length > 80 ? '...' : ''}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingLeft: 22 }}>
        <span className={`badge ${PRIORITY_COLORS[task.prioridade]}`} style={{ fontSize: 10 }}>
          {TASK_PRIORITY_LABELS[task.prioridade]}
        </span>

        {(task as any).pillar && (
          <span className="badge badge-gray" style={{ fontSize: 10 }}>
            <Tag size={9} /> {(task as any).pillar.nome}
          </span>
        )}

        {task.prazo && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: isOverdue ? '#F87171' : 'var(--lilac)',
            marginLeft: 'auto',
          }}>
            <Calendar size={11} />
            {formatDate(task.prazo)}
            {isOverdue && <AlertTriangle size={11} />}
          </span>
        )}
      </div>

      {(task as any).responsavel && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: 22, marginTop: 10,
          paddingTop: 8, borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'white',
          }}>
            {(task as any).responsavel.nome.slice(0,1)}
          </div>
          <span style={{ fontSize: 11, color: 'var(--lilac)' }}>
            {(task as any).responsavel.nome.split(' ')[0]}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Wrapper sortable ──────────────────────────────────────
function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onOpen(task) }}
    >
      <TaskCard task={task} />
    </div>
  )
}

// ─── Coluna do Kanban ──────────────────────────────────────
function KanbanColumn({
  status, tasks, onAddTask, onOpen
}: {
  status: TaskStatus
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
  onOpen: (t: Task) => void
}) {
  const color = COLUMN_COLORS[status]

  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 260,
      maxWidth: 340,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header da coluna */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderRadius: 10,
        background: `${color}18`,
        border: `1px solid ${color}33`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>
            {TASK_STATUS_LABELS[status]}
          </span>
          <span style={{
            background: `${color}30`,
            color,
            borderRadius: 99,
            padding: '1px 7px',
            fontSize: 11,
            fontFamily: 'var(--font-data)',
            fontWeight: 700,
          }}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--lilac)', padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
          title="Adicionar tarefa"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Modal de nova tarefa ──────────────────────────────────
function NovaTaskModal({
  initialStatus,
  clientes,
  pilares,
  onClose,
  onSaved,
}: {
  initialStatus: TaskStatus
  clientes: Client[]
  pilares: Pillar[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    titulo: '', descricao: '', client_id: '',
    pillar_id: '', prioridade: 'media' as TaskPriority,
    prazo: '', status: initialStatus,
  })
  const [loading, setLoading] = useState(false)

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.client_id) return
    setLoading(true)

    try {
      const supabase = createClient()
      await supabase.from('tasks').insert({
        titulo: form.titulo,
        descricao: form.descricao || null,
        client_id: form.client_id,
        pillar_id: form.pillar_id || null,
        prioridade: form.prioridade,
        prazo: form.prazo || null,
        status: form.status,
      })
    } catch { /* network error */ }
    onSaved()
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,4,19,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="glass animate-fade-in-up" style={{ width: '100%', maxWidth: 480, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 20, color: 'var(--cream)', letterSpacing: '0.02em' }}>
            Nova Tarefa
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 8 }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Título *</label>
            <input required value={form.titulo} onChange={e => update('titulo', e.target.value)} placeholder="O que precisa ser feito?" className="input-vettor" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Descrição</label>
            <textarea value={form.descricao} onChange={e => update('descricao', e.target.value)} placeholder="Detalhes opcionais..." className="input-vettor" style={{ resize: 'vertical', minHeight: 72 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Cliente *</label>
              <select required value={form.client_id} onChange={e => update('client_id', e.target.value)} className="input-vettor" style={{ cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Pilar</label>
              <select value={form.pillar_id} onChange={e => update('pillar_id', e.target.value)} className="input-vettor" style={{ cursor: 'pointer' }}>
                <option value="">Sem pilar</option>
                {pilares.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Prioridade</label>
              <select value={form.prioridade} onChange={e => update('prioridade', e.target.value as TaskPriority)} className="input-vettor" style={{ cursor: 'pointer' }}>
                {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>Prazo</label>
              <input type="date" value={form.prazo} onChange={e => update('prazo', e.target.value)} className="input-vettor" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Criar tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal do Kanban ────────────────────────────
export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [clientes, setClientes] = useState<Client[]>([])
  const [pilares, setPilares] = useState<Pillar[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalStatus, setModalStatus] = useState<TaskStatus>('a_fazer')
  const [filterCliente, setFilterCliente] = useState('')
  const [search, setSearch] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [tasksRes, clientesRes, pilaresRes, profilesRes] = await Promise.all([
      supabase.from('tasks').select('*, pillar:pillars(id,nome), responsavel:profiles(id,nome), client:clients(id,nome_empresa)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nome_empresa').eq('ativo', true).order('nome_empresa'),
      supabase.from('pillars').select('*').order('ordem'),
      supabase.from('profiles').select('id, nome, role').order('nome'),
    ])
    setTasks((tasksRes.data as Task[]) || [])
    setClientes((clientesRes.data as Client[]) || [])
    setPilares((pilaresRes.data as Pillar[]) || [])
    setProfiles((profilesRes.data as Profile[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filtragem
  const filteredTasks = tasks.filter(t => {
    if (filterCliente && (t as any).client?.id !== filterCliente) return false
    if (search && !t.titulo.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function getColumnTasks(status: TaskStatus) {
    return filteredTasks.filter(t => t.status === status)
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Verifica se o destino é uma coluna diferente
    const overStatus = COLUMNS.find(s => s === over.id) ||
      tasks.find(t => t.id === over.id)?.status

    if (overStatus && overStatus !== activeTask.status) {
      setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: overStatus } : t))
      try {
        const supabase = createClient()
        await supabase.from('tasks').update({ status: overStatus }).eq('id', activeTask.id)
      } catch { /* offline */ }
    } else if (active.id !== over.id) {
      // Reordena dentro da mesma coluna
      const oldIndex = tasks.findIndex(t => t.id === active.id)
      const newIndex = tasks.findIndex(t => t.id === over.id)
      setTasks(prev => arrayMove(prev, oldIndex, newIndex))
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const overStatus = COLUMNS.find(s => s === over.id)
    if (overStatus) {
      const activeTask = tasks.find(t => t.id === active.id)
      if (activeTask && activeTask.status !== overStatus) {
        setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: overStatus } : t))
      }
    }
  }

  function openModal(status: TaskStatus) {
    setModalStatus(status)
    setShowModal(true)
  }

  const totalByStatus = COLUMNS.reduce((acc, s) => ({ ...acc, [s]: getColumnTasks(s).length }), {} as Record<TaskStatus, number>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 64px - 48px)' }}>
      {/* Cabeçalho */}
      <div className="animate-fade-in-up" style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)', marginBottom: 4 }}>
            Kanban de Tarefas
          </h1>
          <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
            {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button onClick={() => openModal('a_fazer')} className="btn btn-primary">
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="glass animate-fade-in-up delay-100" style={{ display: 'flex', gap: 10, padding: '12px 14px', marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarefa..." className="input-vettor" style={{ paddingLeft: 34, height: 38, fontSize: 13 }} />
        </div>
        <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)} className="input-vettor" style={{ height: 38, fontSize: 13, cursor: 'pointer', minWidth: 180 }}>
          <option value="">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}
        </select>
        {/* Resumo de colunas */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {COLUMNS.map(s => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              background: `${COLUMN_COLORS[s]}15`,
              border: `1px solid ${COLUMN_COLORS[s]}33`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLUMN_COLORS[s] }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-data)', color: COLUMN_COLORS[s], fontWeight: 600 }}>
                {totalByStatus[s]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, color: 'var(--lilac)' }}>
          <Loader2 size={22} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div style={{
            display: 'flex', gap: 14, flex: 1,
            overflowX: 'auto', overflowY: 'auto',
            paddingBottom: 8,
          }}>
            {COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={getColumnTasks(status)}
                onAddTask={openModal}
                onOpen={setDetailTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} overlay />}
          </DragOverlay>
        </DndContext>
      )}

      {showModal && (
        <NovaTaskModal
          initialStatus={modalStatus}
          clientes={clientes}
          pilares={pilares}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData() }}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          clientes={clientes}
          pilares={pilares}
          profiles={profiles}
          onClose={() => setDetailTask(null)}
          onChanged={fetchData}
        />
      )}
    </div>
  )
}
