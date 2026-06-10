const BPS_API =
  'https://webapi.bps.go.id/v1/api/list/model/data/lang/ind/domain/0000/var/1/th/2024/key/your-bps-api-key'

const FALLBACK_INFLASI = 3.5

export interface InflasiData {
  rate: number
  year: number
  source: 'bps' | 'fallback'
  error?: string
}

export async function fetchInflasiRate(): Promise<InflasiData> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // BPS API endpoint untuk inflasi tahunan
    // Catatan: BPS API memerlukan API key. Kalau tidak ada, gunakan fallback.
    const response = await fetch(BPS_API, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`BPS API HTTP ${response.status}`)
    }

    const data = await response.json()

    // Parse nilai inflasi dari response BPS
    // BPS mengembalikan data dalam format yang bervariasi per endpoint
    const nilai = data?.data?.[1]?.[0]?.val
    const tahun = new Date().getFullYear()

    if (nilai && !isNaN(parseFloat(nilai))) {
      return {
        rate: parseFloat(nilai),
        year: tahun,
        source: 'bps',
      }
    }

    throw new Error('Format data BPS tidak dikenali')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      rate: FALLBACK_INFLASI,
      year: new Date().getFullYear(),
      source: 'fallback',
      error: message,
    }
  }
}

// Kalkulasi real return setelah inflasi
export function calculateRealReturn(
  nominalReturnPercent: number,
  inflasiPercent: number
): number {
  const nominal = nominalReturnPercent / 100
  const inflasi = inflasiPercent / 100
  return (((1 + nominal) / (1 + inflasi) - 1) * 100)
}
