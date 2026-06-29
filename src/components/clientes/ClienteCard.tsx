'use client'

import Link from 'next/link'
import { Client } from '@/types/database'
import { formatDate, ONBOARDING_LABELS } from '@/lib/utils'
import { Building2, Phone, Mail, MoreVertical, ExternalLink, Pencil } from 'lucide-react'
import { useState } from 'react'
import { createClient as createSupabase } from '@/lib/supabase/client'

interface ClienteCardProps {
  cliente: Client
  onUpdated: () => void
}

const onboardingColors: Record<string, string> = {
  pendente: 'badge-gray',
  em_andamento: 'badge-amber',
  concluido: 'badge-green',
}

export function ClienteCard({ cliente, onUpdated }: ClienteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [desativando, setDesativando] = useState(false)

  async function toggleAtivo() {
    setDesativando(true)
    setMenuOpen(false)
    try {
      const supabase = createSupabase()
      await supabase
        .from('clients')
        .update({ ativo: !cliente.ativo })
        .eq('id', cliente.id)
    } catch { /* offline */ }
    onUpdated()
    setDesativando(false)
  }


  return (
    <div className="glass glass-hover" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      position: 'relative',
      opacity: desativando ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Cabeçalho do card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {/* Avatar empresa */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-title)', fontSize: 18,
            color: 'white', flexShrink: 0,
            letterSpacing: '0.02em',
          }}>
            {cliente.nome_empresa.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontFamily: 'var(--font-data)',
              fontSize: 15, fontWeight: 700,
              color: 'var(--cream)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: 3,
            }}>
              {cliente.nome_empresa}
            </h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cliente.plataforma && (
                <span className="badge badge-violet" style={{ fontSize: 10 }}>{cliente.plataforma}</span>
              )}
              {cliente.segmento && (
                <span className="badge badge-gray" style={{ fontSize: 10 }}>{cliente.segmento}</span>
              )}
            </div>
          </div>
        </div>

        {/* Menu de ações */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            id={`menu-cliente-${cliente.id}`}
            onClick={() => setMenuOpen(!menuOpen)}
            className="btn btn-ghost btn-sm"
            style={{ padding: 6 }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 20,
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                padding: '4px',
                minWidth: 160,
                boxShadow: 'var(--shadow-lg)',
              }}>
                <Link
                  href={`/clientes/${cliente.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 6,
                    textDecoration: 'none', color: 'var(--cream)',
                    fontSize: 13, fontFamily: 'var(--font-data)',
                  }}
                  className="glass-hover"
                >
                  <ExternalLink size={13} /> Ver ficha
                </Link>
                <button
                  onClick={toggleAtivo}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: cliente.ativo ? '#F87171' : '#34D399',
                    fontSize: 13, fontFamily: 'var(--font-data)',
                    width: '100%', textAlign: 'left',
                  }}
                >
                  <Pencil size={13} />
                  {cliente.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status de onboarding */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--lilac)' }}>Onboarding</span>
        <span className={`badge ${onboardingColors[cliente.status_onboarding] || 'badge-gray'}`}>
          {ONBOARDING_LABELS[cliente.status_onboarding]}
        </span>
      </div>

      {/* Informações de contato */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px',
        borderRadius: 8,
        background: 'rgba(19,8,35,0.4)',
        border: '1px solid var(--border-subtle)',
      }}>
        {cliente.contato_nome && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--lilac)' }}>
            <Building2 size={12} style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--cream)', fontWeight: 500 }}>{cliente.contato_nome}</span>
          </div>
        )}
        {cliente.contato_email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--lilac)' }}>
            <Mail size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cliente.contato_email}
            </span>
          </div>
        )}
        {cliente.contato_whatsapp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--lilac)' }}>
            <Phone size={12} style={{ flexShrink: 0 }} />
            {cliente.contato_whatsapp}
          </div>
        )}
        {!cliente.contato_nome && !cliente.contato_email && !cliente.contato_whatsapp && (
          <span style={{ fontSize: 12, color: 'rgba(174,150,214,0.4)', fontStyle: 'italic' }}>
            Nenhum contato cadastrado
          </span>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'rgba(174,150,214,0.5)' }}>
          Desde {formatDate(cliente.created_at)}
        </span>
        <Link
          href={`/clientes/${cliente.id}`}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, gap: 4, padding: '5px 10px' }}
        >
          Ver ficha <ExternalLink size={11} />
        </Link>
      </div>

      {/* Badge inativo */}
      {!cliente.ativo && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 6, padding: '2px 8px',
          fontSize: 10, color: '#F87171',
          fontFamily: 'var(--font-data)', fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Inativo
        </div>
      )}
    </div>
  )
}
