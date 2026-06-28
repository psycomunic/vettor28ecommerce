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
