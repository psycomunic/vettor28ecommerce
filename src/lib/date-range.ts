// ============================================================
// VETTOR 28 — Filtro de período compartilhado
// Usado pelo Dashboard, Resultados e demais telas com datas.
// ============================================================

export type PeriodPreset =
  | 'hoje' | 'ontem' | '7' | '14' | '30' | '60' | '90' | '180' | 'ano' | 'custom'

export interface PeriodOption {
  key: PeriodPreset
  label: string
  short: string
}

/** Conjunto compacto (Dashboard). */
export const PERIOD_OPTIONS_COMPACT: PeriodOption[] = [
  { key: 'hoje', label: 'Hoje', short: 'Hoje' },
  { key: '7',    label: '7 dias', short: '7d' },
  { key: '30',   label: '30 dias', short: '30d' },
  { key: '60',   label: '60 dias', short: '60d' },
  { key: '90',   label: '90 dias', short: '90d' },
  { key: 'custom', label: 'Personalizado', short: 'Personalizado' },
]

/** Conjunto completo (Resultados / Relatórios). */
export const PERIOD_OPTIONS_FULL: PeriodOption[] = [
  { key: 'hoje', label: 'Hoje', short: 'Hoje' },
  { key: 'ontem', label: 'Ontem', short: 'Ontem' },
  { key: '7',    label: '7 dias', short: '7d' },
  { key: '14',   label: '14 dias', short: '14d' },
  { key: '30',   label: '30 dias', short: '30d' },
  { key: '60',   label: '60 dias', short: '60d' },
  { key: '90',   label: '90 dias', short: '90d' },
  { key: '180',  label: '6 meses', short: '6m' },
  { key: 'ano',  label: 'Este ano', short: 'Ano' },
  { key: 'custom', label: 'Personalizado', short: 'Personalizado' },
]

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
}

export interface PeriodRange {
  start: string
  end: string
  prevStart: string
  prevEnd: string
  label: string
  /** nº de dias no período atual (1 = só hoje) */
  days: number
}

/**
 * Resolve um preset (ou intervalo personalizado) para datas absolutas,
 * incluindo o período anterior equivalente para comparação.
 */
export function getPeriodRange(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
): PeriodRange {
  const t = todayISO()

  if (preset === 'hoje') {
    const y = daysAgoISO(1)
    return { start: t, end: t, prevStart: y, prevEnd: y, label: 'Hoje', days: 1 }
  }

  if (preset === 'ontem') {
    const y = daysAgoISO(1)
    const d2 = daysAgoISO(2)
    return { start: y, end: y, prevStart: d2, prevEnd: d2, label: 'Ontem', days: 1 }
  }

  if (preset === 'custom') {
    const start = customStart || daysAgoISO(30)
    const end = customEnd || t
    const s = new Date(start)
    const e = new Date(end)
    const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 864e5) + 1)
    const prevEnd = new Date(s.getTime() - 864e5).toISOString().slice(0, 10)
    const prevStart = new Date(s.getTime() - days * 864e5).toISOString().slice(0, 10)
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    return { start, end, prevStart, prevEnd, label: `${fmt(start)} – ${fmt(end)}`, days }
  }

  if (preset === 'ano') {
    const year = new Date().getFullYear()
    const start = `${year}-01-01`
    const days = Math.max(1, Math.ceil((new Date(t).getTime() - new Date(start).getTime()) / 864e5) + 1)
    return {
      start, end: t,
      prevStart: `${year - 1}-01-01`,
      prevEnd: `${year - 1}-12-31`,
      label: 'Este ano', days,
    }
  }

  // presets numéricos (últimos N dias, incluindo hoje)
  const n = parseInt(preset, 10)
  const start = daysAgoISO(n - 1)
  const opt = PERIOD_OPTIONS_FULL.find(o => o.key === preset)
  return {
    start, end: t,
    prevStart: daysAgoISO(n * 2 - 1),
    prevEnd: daysAgoISO(n),
    label: opt?.label || `${n} dias`,
    days: n,
  }
}
