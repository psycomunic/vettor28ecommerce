import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um número como moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata uma data ISO para o padrão brasileiro
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

/**
 * Retorna a inicial(is) para avatar
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

/**
 * Labels em português para os enums do banco
 */
export const ROLE_LABELS = {
  admin: 'Admin',
  gestor: 'Gestor',
  colaborador: 'Colaborador',
  cliente: 'Cliente',
} as const

export const ONBOARDING_LABELS = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
} as const

export const CONTRACT_STATUS_LABELS = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  encerrado: 'Encerrado',
} as const

export const TASK_STATUS_LABELS = {
  a_fazer: 'A fazer',
  fazendo: 'Fazendo',
  revisao: 'Revisão',
  concluido: 'Concluído',
} as const

export const TASK_PRIORITY_LABELS = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
} as const

export const PLATFORM_OPTIONS = [
  'Tray',
  'NuvemShop',
  'Magazord',
  'Shopify',
  'WooCommerce',
  'VTEX',
  'Outro',
]

export const SEGMENT_OPTIONS = [
  'Moda',
  'Casa & Decoração',
  'Eletrônicos',
  'Saúde & Beleza',
  'Alimentos & Bebidas',
  'Esportes',
  'Infantil',
  'Automotivo',
  'Pet',
  'Outro',
]
