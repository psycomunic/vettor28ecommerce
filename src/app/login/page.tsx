'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const supabase = createClient()

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // ── Modo Supabase normal ──────────────────────────────────
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage({ type: 'error', text: 'E-mail ou senha incorretos. Verifique e tente novamente.' })
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: 'Erro ao enviar o link. Verifique o e-mail e tente novamente.' })
    } else {
      setMessage({ type: 'success', text: 'Link enviado! Verifique sua caixa de entrada.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--void)' }}>

      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Grid sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(174,150,214,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(174,150,214,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* Card de login */}
      <div className="glass animate-fade-in-up" style={{
        width: '100%',
        maxWidth: 440,
        margin: '0 16px',
        padding: '48px 40px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo / Marca */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            marginBottom: 20,
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
          }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-title)',
            fontSize: 28,
            letterSpacing: '0.04em',
            color: 'var(--cream)',
            marginBottom: 6,
          }}>
            VETTOR 28
          </h1>
          <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
            Sistema de Gestão de Clientes
          </p>
        </div>

        {/* Toggle modo */}
        <div style={{
          display: 'flex',
          background: 'rgba(19,8,35,0.8)',
          borderRadius: 10,
          padding: 4,
          marginBottom: 28,
          border: '1px solid var(--border-subtle)',
        }}>
          {(['password', 'magic'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-data)',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
                background: mode === m ? 'linear-gradient(135deg, var(--violet), var(--violet-2))' : 'transparent',
                color: mode === m ? 'white' : 'var(--lilac)',
              }}
            >
              {m === 'password' ? '🔑 Senha' : '✉️ Magic Link'}
            </button>
          ))}
        </div>

        {/* Formulário */}
        <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--lilac)', marginBottom: 6, fontFamily: 'var(--font-data)', fontWeight: 500 }}>
              E-mail
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-vettor"
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          {mode === 'password' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--lilac)', marginBottom: 6, fontFamily: 'var(--font-data)', fontWeight: 500 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-vettor"
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lilac)', padding: 0 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'magic' && (
            <p style={{ fontSize: 13, color: 'var(--lilac)', marginBottom: 24, lineHeight: 1.5 }}>
              Enviaremos um link de acesso para seu e-mail. Clique nele para entrar sem precisar de senha.
            </p>
          )}

          {/* Mensagem de feedback */}
          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: message.type === 'error' ? '#F87171' : '#34D399',
            }}>
              {message.text}
            </div>
          )}

          <button
            id="btn-login"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: 15, padding: '13px 24px' }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {mode === 'password' ? 'Entrar' : 'Enviar link de acesso'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé */}
        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'rgba(174,150,214,0.5)' }}>
          Acesso restrito a colaboradores da VETTOR 28.<br />
          Problemas? Fale com o administrador.
        </p>
      </div>
    </div>
  )
}
