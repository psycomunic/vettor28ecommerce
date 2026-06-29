'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, AtSign, Check, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

interface Notif {
  id: string
  tipo: string
  mensagem: string
  link: string | null
  lida: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function NotificationBell() {
  const supabase = createClient()
  const router = useRouter()
  const { profile: me } = useUser()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!me) return
    const { data, error } = await supabase
      .from('notifications').select('*').eq('user_id', me.id)
      .order('created_at', { ascending: false }).limit(30)
    if (!error) setItems((data as Notif[]) || [])
  }, [me, supabase])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [load])

  // fecha ao clicar fora
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const unread = items.filter(n => !n.lida).length

  async function markAllRead() {
    if (!me) return
    setItems(prev => prev.map(n => ({ ...n, lida: true })))
    try { await supabase.from('notifications').update({ lida: true }).eq('user_id', me.id).eq('lida', false) } catch {}
  }
  async function clickItem(n: Notif) {
    if (!n.lida) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x))
      try { await supabase.from('notifications').update({ lida: true }).eq('id', n.id) } catch {}
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(o => !o); if (!open) load() }} className="btn btn-ghost" style={{ padding: 8, position: 'relative' }} aria-label="Notificações">
        <Bell size={20} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: 'var(--amber)', color: 'var(--void)', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-data)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ink-1)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in-up" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, maxHeight: 440, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>Notificações</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--violet-2)', fontSize: 12, fontFamily: 'var(--font-data)' }}>
                <CheckCheck size={13} /> Marcar todas
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Bell size={26} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                Nenhuma notificação ainda.
              </div>
            ) : items.map(n => (
              <button key={n.id} onClick={() => clickItem(n)} style={{ display: 'flex', gap: 11, width: '100%', padding: '11px 14px', background: n.lida ? 'transparent' : 'rgba(124,58,237,0.08)', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = n.lida ? 'transparent' : 'rgba(124,58,237,0.08)')}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'rgba(124,58,237,0.18)', color: 'var(--violet-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {n.tipo === 'mencao' ? <AtSign size={15} /> : <Bell size={15} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.4 }}>{n.mensagem}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.lida && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 6 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
