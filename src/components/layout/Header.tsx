'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useUser()
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <header style={{
      height: 64,
      background: 'rgba(19,8,35,0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>

      {/* Botão menu mobile — escondido em desktop via CSS (.mobile-menu-btn) */}
      <button
        id="btn-menu-mobile"
        onClick={onMenuClick}
        className="mobile-menu-btn"
        style={{ padding: 8, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lilac)', display: 'flex', alignItems: 'center' }}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Barra de busca */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: searchFocused ? 'var(--violet-2)' : 'var(--lilac)',
            transition: 'color 0.2s',
          }}
        />
        <input
          id="header-search"
          type="text"
          placeholder="Buscar clientes, tarefas..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="input-vettor"
          style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Notificações */}
      <button
        id="btn-notifications"
        className="btn btn-ghost"
        style={{ padding: 8, position: 'relative' }}
        aria-label="Notificações"
      >
        <Bell size={20} />
        <span style={{
          position: 'absolute',
          top: 6, right: 6,
          width: 8, height: 8,
          borderRadius: '50%',
          background: 'var(--amber)',
          border: '2px solid var(--ink-1)',
        }} />
      </button>

      {/* Avatar do usuário */}
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700,
            color: 'white',
            boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
          }}>
            {profile.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)' }}>
              {profile.nome.split(' ')[0]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--lilac)', textTransform: 'capitalize' }}>
              {profile.role}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
