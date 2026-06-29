'use client'

import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import { Sparkline } from './Sparkline'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  color?: string
  href?: string
  /** Variação percentual vs. período anterior (ex.: 8.4 = +8,4%) */
  delta?: number | null
  /** Quando true, alta = bom (verde). Quando false (ex.: CAC), alta = ruim. */
  positiveIsGood?: boolean
  sparkline?: number[]
  sub?: string
}

export function StatCard({
  label, value, icon, color = 'var(--violet)', href,
  delta = null, positiveIsGood = true, sparkline, sub,
}: StatCardProps) {
  const hasDelta = delta != null && isFinite(delta)
  const up = hasDelta && (delta as number) >= 0
  const good = hasDelta ? (up ? positiveIsGood : !positiveIsGood) : true
  const deltaColor = !hasDelta ? 'var(--lilac)' : good ? '#34D399' : '#F87171'

  const inner = (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stat-card__icon" style={{ background: `${color}1f`, color }}>
          {icon}
        </div>
        {href ? (
          <ArrowRight size={15} className="stat-card__arrow" />
        ) : sparkline && sparkline.length > 1 ? (
          <Sparkline data={sparkline} color={color} width={84} height={30} />
        ) : null}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 26, fontWeight: 700, color: 'var(--cream)', lineHeight: 1 }}>
            {value}
          </span>
          {hasDelta && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, color: deltaColor,
            }}>
              {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(delta as number).toFixed(1)}%
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--lilac)', marginTop: 6 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'rgba(174,150,214,0.5)', marginTop: 2 }}>{sub}</div>}
      </div>

      {href && sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: 12, opacity: 0.9 }}>
          <Sparkline data={sparkline} color={color} width={140} height={26} />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
  }
  return inner
}
