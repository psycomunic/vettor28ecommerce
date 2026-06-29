'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ToastProvider } from '@/context/ToastContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <style>{`
        @media (min-width: 1024px) {
          .sidebar-spacer { display: block !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--void)' }}>
        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10,4,19,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 40,
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Espaçador desktop — empurra o conteúdo para a direita da sidebar */}
        <div
          className="sidebar-spacer"
          style={{ width: 256, minWidth: 256, flexShrink: 0, display: 'none' }}
        />

        {/* Conteúdo principal */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            maxWidth: '100%',
          }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
