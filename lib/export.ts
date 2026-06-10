'use client'

// ============================================================
// Export utilities — semua pure client-side, tidak ada server load
// ============================================================

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          const stringValue =
            value === null || value === undefined ? '' : String(value)
          // Escape quotes dan wrap kalau ada koma atau newline
          if (
            stringValue.includes(',') ||
            stringValue.includes('"') ||
            stringValue.includes('\n')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(',')
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  })
  downloadBlob(blob, `${filename}.csv`)
}

export function exportToJSON<T>(data: T, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  downloadBlob(blob, `${filename}.json`)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================
// Format helpers untuk Indonesia
// ============================================================

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTanggalIndonesia(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTanggalPendek(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatAngka(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatPersen(num: number, decimals = 1): string {
  return `${num.toFixed(decimals)}%`
}

// Format durasi dari detik
export function formatDurasi(detik: number): string {
  const jam = Math.floor(detik / 3600)
  const menit = Math.floor((detik % 3600) / 60)
  const sisa = detik % 60

  if (jam > 0) {
    return `${jam}j ${menit}m`
  }
  if (menit > 0) {
    return `${menit}m ${sisa}d`
  }
  return `${sisa}d`
}

// Singkat angka besar: 1.500.000 → 1,5 Jt
export function formatRupiahSingkat(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} Rb`
  }
  return `Rp ${amount}`
}
