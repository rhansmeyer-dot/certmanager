import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_LABELS: Record<string, string> = {
  identified: 'Identifiziert',
  analyzed: 'Analysiert',
  outline_sent: 'Outline gesendet',
  contract_sent: 'Vertrag gesendet',
  contract_signed: 'Vertrag unterzeichnet',
  certification_in_progress: 'Zertifizierung läuft',
  certified: 'Zertifiziert ✓',
  dropped: 'Inaktiv',
}

export const STATUS_COLORS: Record<string, string> = {
  identified: 'bg-gray-100 text-gray-700',
  analyzed: 'bg-blue-100 text-blue-700',
  outline_sent: 'bg-purple-100 text-purple-700',
  contract_sent: 'bg-yellow-100 text-yellow-700',
  contract_signed: 'bg-orange-100 text-orange-700',
  certification_in_progress: 'bg-indigo-100 text-indigo-700',
  certified: 'bg-green-100 text-green-700',
  dropped: 'bg-red-100 text-red-700',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Einfach',
  medium: 'Mittel',
  complex: 'Komplex',
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  complex: 'bg-red-100 text-red-700',
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

export function formatRelative(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return `Vor ${diffDays} Tagen`
  if (diffDays < 30) return `Vor ${Math.floor(diffDays / 7)} Wochen`
  return formatDate(date)
}

export function daysInStatus(candidate: any): number {
  const statusDateMap: Record<string, string> = {
    identified: 'identifiedAt',
    analyzed: 'analyzedAt',
    outline_sent: 'outlineSentAt',
    contract_sent: 'contractSentAt',
    contract_signed: 'contractSignedAt',
    certification_in_progress: 'certificationStartedAt',
    certified: 'certifiedAt',
  }
  const field = statusDateMap[candidate.status]
  if (!field || !candidate[field]) return 0
  return Math.floor((Date.now() - new Date(candidate[field]).getTime()) / (1000 * 60 * 60 * 24))
}
