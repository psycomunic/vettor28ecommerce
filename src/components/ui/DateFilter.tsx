'use client'

import { Calendar, X } from 'lucide-react'
import {
  PeriodPreset, PeriodOption, PERIOD_OPTIONS_COMPACT, todayISO,
} from '@/lib/date-range'

interface DateFilterProps {
  period: PeriodPreset
  onPeriodChange: (p: PeriodPreset) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (v: string) => void
  onCustomEndChange: (v: string) => void
  options?: PeriodOption[]
  /** texto auxiliar à direita (ex.: "124 registros") */
  hint?: string
}

/**
 * Filtro de período reutilizável (premium dark).
 * Inclui presets, "Hoje" e intervalo personalizado (data inicial/final).
 */
export function DateFilter({
  period, onPeriodChange, customStart, customEnd,
  onCustomStartChange, onCustomEndChange,
  options = PERIOD_OPTIONS_COMPACT, hint,
}: DateFilterProps) {
  const showCustom = period === 'custom'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="segmented" role="group" aria-label="Período">
          {options.map(opt => (
            <button
              key={opt.key}
              data-active={period === opt.key}
              data-custom={opt.key === 'custom' ? 'true' : undefined}
              onClick={() => onPeriodChange(opt.key)}
              style={opt.key === 'custom' ? { display: 'inline-flex', alignItems: 'center', gap: 5 } : undefined}
            >
              {opt.key === 'custom' && <Calendar size={12} />}
              {opt.short}
            </button>
          ))}
        </div>
        {hint && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-data)', whiteSpace: 'nowrap' }}>
            {hint}
          </span>
        )}
      </div>

      {showCustom && (
        <div
          className="animate-fade-in-up"
          style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.28)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--lilac)', fontFamily: 'var(--font-data)', fontWeight: 600 }}>
            <Calendar size={14} style={{ color: 'var(--violet-2)' }} /> Período personalizado
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>De</label>
            <input
              type="date"
              value={customStart}
              max={customEnd || todayISO()}
              onChange={e => onCustomStartChange(e.target.value)}
              className="input-vettor"
              style={{ height: 34, fontSize: 12.5, width: 150, padding: '6px 10px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>Até</label>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={todayISO()}
              onChange={e => onCustomEndChange(e.target.value)}
              className="input-vettor"
              style={{ height: 34, fontSize: 12.5, width: 150, padding: '6px 10px' }}
            />
          </div>
          <button
            onClick={() => onPeriodChange('30')}
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, marginLeft: 'auto' }}
            aria-label="Fechar período personalizado"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
