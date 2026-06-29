'use client'

import { useState } from 'react'
import { Profile } from '@/types/database'
import { ROLE_LABELS, formatDate } from '@/lib/utils'
import { Users, Plus, Mail, Shield, Loader2, X, Check, AlertTriangle } from 'lucide-react'

interface Props {
  usuarios: Profile[]
  clientes: { id: string; nome_empresa: string }[]
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'badge-violet',
  gestor: 'badge-amber',
  colaborador: 'badge-gray',
  cliente: 'badge-green',
}

export function UsuariosClient({ usuarios, clientes }: Props) {
  const [showConvite, setShowConvite] = useState(false)
  const [conviteEmail, setConviteEmail] = useState('')
  const [conviteNome, setConviteNome] = useState('')
  const [conviteRole, setConviteRole] = useState<string>('colaborador')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleConvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: conviteEmail, nome: conviteNome, role: conviteRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar convite.' })
      } else {
        setMessage({ type: 'success', text: `✅ Convite enviado para ${conviteEmail}! O usuário ficará como Pendente até aceitar o link.` })
        setConviteEmail('')
        setConviteNome('')
        setConviteRole('colaborador')
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao enviar convite. Tente novamente.' })
    }
    setLoading(false)
  }


  return (
    <div>
      {/* Cabeçalho */}
      <div className="animate-fade-in-up" style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 28,
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--cream)', marginBottom: 4 }}>
            Usuários
          </h1>
          <p style={{ color: 'var(--lilac)', fontSize: 14 }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} na base
          </p>
        </div>
        <button
          id="btn-convidar-usuario"
          onClick={() => setShowConvite(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Convidar Usuário
        </button>
      </div>

      {/* Tabela de usuários */}
      <div className="glass animate-fade-in-up" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-vettor">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Membro desde</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700,
                        color: 'white', flexShrink: 0,
                      }}>
                        {u.nome.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)' }}>
                          {u.nome}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--lilac)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={12} /> {u.email}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${ROLE_COLORS[u.role] || 'badge-gray'}`}>
                      <Shield size={10} />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td>
                    {u.status === 'ativo' && (
                      <span className="badge badge-green">
                        <Check size={10} /> Ativo
                      </span>
                    )}
                    {u.status === 'pendente' && (
                      <span className="badge badge-amber">
                        <Mail size={10} /> Pendente
                      </span>
                    )}
                    {u.status === 'inativo' && (
                      <span className="badge badge-red">
                        <X size={10} /> Inativo
                      </span>
                    )}
                    {!['ativo','pendente','inativo'].includes(u.status) && (
                      <span className="badge badge-gray">
                        {u.status}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--lilac)', fontSize: 13 }}>
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--lilac)' }}>
                    <Users size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>Nenhum usuário encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Convite */}
      {showConvite && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(10,4,19,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div className="glass animate-fade-in-up" style={{ width: '100%', maxWidth: 480, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 22, color: 'var(--cream)', letterSpacing: '0.02em' }}>
                  Convidar Usuário
                </h2>
                <p style={{ color: 'var(--lilac)', fontSize: 13, marginTop: 2 }}>
                  Um link de acesso será enviado por e-mail.
                </p>
              </div>
              <button onClick={() => { setShowConvite(false); setMessage(null) }} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>
                  Nome completo *
                </label>
                <input
                  id="convite-nome"
                  required
                  type="text"
                  placeholder="Nome do colaborador"
                  value={conviteNome}
                  onChange={e => setConviteNome(e.target.value)}
                  className="input-vettor"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>
                  E-mail *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lilac)' }} />
                  <input
                    id="convite-email"
                    required
                    type="email"
                    placeholder="colaborador@email.com"
                    value={conviteEmail}
                    onChange={e => setConviteEmail(e.target.value)}
                    className="input-vettor"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--lilac)', marginBottom: 5, fontFamily: 'var(--font-data)' }}>
                  Papel
                </label>
                <select
                  id="convite-role"
                  value={conviteRole}
                  onChange={e => setConviteRole(e.target.value)}
                  className="input-vettor"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="gestor">Gestor</option>
                  <option value="cliente">Cliente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Info sobre clientes */}
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--lilac)' }}>
                  Após o convite ser aceito, atribua clientes e pilares ao usuário editando seu perfil.
                </p>
              </div>

              {/* Feedback */}
              {message && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: message.type === 'error' ? '#F87171' : '#34D399',
                  fontSize: 13,
                }}>
                  {message.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => { setShowConvite(false); setMessage(null) }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  id="btn-enviar-convite"
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={15} />}
                  Enviar convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
