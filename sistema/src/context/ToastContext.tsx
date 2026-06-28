'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── Configuração visual ─────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; color: string }> = {
  success: { icon: <CheckCircle2 size={18} />, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#34D399' },
  error:   { icon: <XCircle size={18} />,      bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#F87171' },
  warning: { icon: <AlertTriangle size={18} />, bg: 'rgba(245,166,35,0.12)',border: 'rgba(245,166,35,0.35)', color: '#F5A623' },
  info:    { icon: <Info size={18} />,          bg: 'rgba(124,58,237,0.12)',border: 'rgba(124,58,237,0.35)', color: '#A855F7' },
}

// ─── Provider ────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast])
  const error   = useCallback((t: string, m?: string) => toast('error',   t, m), [toast])
  const warning = useCallback((t: string, m?: string) => toast('warning', t, m), [toast])
  const info    = useCallback((t: string, m?: string) => toast('info',    t, m), [toast])

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}

      {/* Stack de toasts */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column-reverse', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const cfg = TOAST_CONFIG[t.type]
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 16px', borderRadius: 12,
                background: `rgba(20,8,40,0.97)`,
                border: `1px solid ${cfg.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                minWidth: 300, maxWidth: 380,
                animation: 'slideInRight 0.25s ease-out',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: t.message ? 3 : 0 }}>
                  {t.title}
                </div>
                {t.message && <div style={{ fontSize: 12, color: 'var(--lilac)', lineHeight: 1.5 }}>{t.message}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lilac)', padding: 2, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
