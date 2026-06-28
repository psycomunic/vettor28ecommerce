'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Briefcase, CheckSquare, Map,
  BarChart2, FileText, Settings, X, Zap, LogOut, Plug
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'

const navItems = [
  { href: '/',            label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','gestor','colaborador'] },
  { href: '/clientes',    label: 'Clientes',       icon: Briefcase,       roles: ['admin','gestor','colaborador'] },
  { href: '/tarefas',     label: 'Tarefas',        icon: CheckSquare,     roles: ['admin','gestor','colaborador'] },
  { href: '/onboarding',  label: 'Onboarding',     icon: Map,             roles: ['admin','gestor','colaborador'] },
  { href: '/resultados',  label: 'Resultados',     icon: BarChart2,       roles: ['admin','gestor','colaborador'] },
  { href: '/relatorios',  label: 'Relatórios',     icon: FileText,        roles: ['admin','gestor','colaborador'] },
  { href: '/integracoes', label: 'Integrações',    icon: Plug,            roles: ['admin','gestor'] },
  { href: '/usuarios',    label: 'Usuários',       icon: Users,           roles: ['admin'] },
  { href: '/configuracoes',label: 'Configurações', icon: Settings,        roles: ['admin'] },
]

// Portal do cliente — itens exclusivos
const clientNavItems = [
  { href: '/portal',       label: 'Meus Resultados', icon: BarChart2 },
  { href: '/portal/relatorios', label: 'Relatórios', icon: FileText },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useUser()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const items = profile?.role === 'cliente'
    ? clientNavItems
    : navItems.filter(item => !profile || item.roles.includes(profile.role))

  return (
    <aside style={{
      width: 256,
      minWidth: 256,
      background: 'var(--ink-1)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100dvh',
      zIndex: 50,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}
    className="lg:!translate-x-0 lg:relative lg:h-auto">

      {/* Header da sidebar */}
      <div style={{
        padding: '20px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
            flexShrink: 0,
          }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 16, letterSpacing: '0.04em', color: 'var(--cream)' }}>
              VETTOR 28
            </div>
            <div style={{ fontSize: 10, color: 'var(--lilac)', fontFamily: 'var(--font-data)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {profile?.role === 'cliente' ? 'Portal do Cliente' : 'Sistema de Gestão'}
            </div>
          </div>
        </Link>

        {/* Botão fechar (mobile) */}
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm lg:hidden"
          style={{ padding: '6px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 8 }}>
          <p style={{
            fontSize: 10, fontFamily: 'var(--font-data)', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(174,150,214,0.4)', padding: '0 8px', marginBottom: 6,
          }}>
            {profile?.role === 'cliente' ? 'Minha empresa' : 'Menu principal'}
          </p>

          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 2,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: isActive ? 'var(--violet-2)' : 'var(--lilac)',
                  fontFamily: 'var(--font-data)',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '2px solid var(--violet)' : '2px solid transparent',
                }}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer — usuário + logout */}
      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {profile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderRadius: 8,
            marginBottom: 8,
            background: 'rgba(28,15,53,0.6)',
            border: '1px solid var(--border-subtle)',
          }}>
            {/* Avatar */}
            <div style={{
              width: 34, height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--violet), var(--violet-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700,
              color: 'white', flexShrink: 0,
            }}>
              {profile.nome.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-data)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.nome.split(' ')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--lilac)', textTransform: 'capitalize' }}>
                {profile.role}
              </div>
            </div>
          </div>
        )}

        <button
          id="btn-logout"
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 10, color: 'var(--lilac)', fontSize: 13 }}
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
