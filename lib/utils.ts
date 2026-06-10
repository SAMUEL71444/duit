import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Warna status sesuai spec
export const STATUS_COLORS = {
  positif: '#1D9E75',
  negatif: '#E24B4A',
  warning: '#BA7517',
  info: '#378ADD',
} as const

// Nama bulan Indonesia
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Nama hari Indonesia
export const NAMA_HARI = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
]

export function getBulanTahun(date: Date = new Date()): string {
  return `${NAMA_BULAN[date.getMonth()]} ${date.getFullYear()}`
}

export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

// Hitung selisih hari antara dua tanggal
export function daysDiff(date1: Date, date2: Date): number {
  const diff = date2.getTime() - date1.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Apakah tanggal lebih dari N hari yang lalu?
export function isMoreThanDaysAgo(date: Date | string | null, days: number): boolean {
  if (!date) return true
  const d = typeof date === 'string' ? new Date(date) : date
  return daysDiff(d, new Date()) > days
}

// Truncate teks panjang
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Generate warna konsisten dari string (untuk avatar/badge)
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 45%)`
}

// Initials dari nama
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
