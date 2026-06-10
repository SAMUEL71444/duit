'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { ErrorBanner } from '@/components/ui/error-banner'
import { exportToCSV, exportToJSON, formatRupiah } from '@/lib/export'
import { Download, Calculator, TrendingUp, Info } from 'lucide-react'

const STORAGE_KEY = 'rate_calculator_data'

const MARKET_RATES = [
  { level: 'Junior', min: 40000, max: 75000, color: '#378ADD' },
  { level: 'Mid-level', min: 75000, max: 150000, color: '#BA7517' },
  { level: 'Senior', min: 150000, max: 350000, color: '#1D9E75' },
]

interface RateData {
  targetIncome: string
  workingDays: string
  hoursPerDay: string
  overhead: string
  bufferPercent: string
}

const DEFAULT_DATA: RateData = {
  targetIncome: '20000000',
  workingDays: '20',
  hoursPerDay: '6',
  overhead: '2000000',
  bufferPercent: '20',
}

export default function RateCalculatorPage() {
  const [data, setData] = useState<RateData>(DEFAULT_DATA)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setData(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ============================================================
  // Kalkulasi — semua client-side
  // ============================================================
  const targetIncome = parseInt(data.targetIncome) || 0
  const workingDays = parseInt(data.workingDays) || 20
  const hoursPerDay = parseInt(data.hoursPerDay) || 6
  const overhead = parseInt(data.overhead) || 0
  const bufferPercent = parseInt(data.bufferPercent) || 0

  const totalHoursPerMonth = workingDays * hoursPerDay
  const totalNeeded = targetIncome + overhead
  const baseHourlyRate = totalHoursPerMonth > 0 ? Math.ceil(totalNeeded / totalHoursPerMonth) : 0
  const bufferMultiplier = 1 + bufferPercent / 100
  const idealHourlyRate = Math.ceil(baseHourlyRate * bufferMultiplier)
  const minDailyRate = Math.ceil(idealHourlyRate * hoursPerDay)
  const minProjectRate3Days = minDailyRate * 3
  const minProjectRate1Week = minDailyRate * 5

  // Posisi vs market
  function getMarketPosition(rate: number) {
    if (rate < MARKET_RATES[0].min) return { label: 'Di bawah Junior', color: '#E24B4A' }
    if (rate < MARKET_RATES[1].min) return { label: 'Junior', color: '#378ADD' }
    if (rate < MARKET_RATES[2].min) return { label: 'Mid-level', color: '#BA7517' }
    if (rate < MARKET_RATES[2].max) return { label: 'Senior', color: '#1D9E75' }
    return { label: 'Above Senior', color: '#7C3AED' }
  }

  const marketPos = getMarketPosition(idealHourlyRate)

  // Export
  function handleExportCSV() {
    exportToCSV([{
      target_income: targetIncome,
      hari_kerja: workingDays,
      jam_per_hari: hoursPerDay,
      overhead,
      buffer_persen: bufferPercent,
      ideal_hourly_rate: idealHourlyRate,
      min_daily_rate: minDailyRate,
      min_rate_3_hari: minProjectRate3Days,
      min_rate_1_minggu: minProjectRate1Week,
      posisi_market: marketPos.label,
    }], 'rate-calculator')
  }

  function handleExportJSON() {
    exportToJSON({
      input: data,
      output: { idealHourlyRate, minDailyRate, minProjectRate3Days, minProjectRate1Week, marketPos: marketPos.label }
    }, 'rate-calculator')
  }

  const inputClass = 'grid grid-cols-1 sm:grid-cols-2 gap-4'

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Rate Calculator</h1>
          <p className="text-gray-400 text-sm mt-1">Hitung ideal hourly rate berdasarkan target income kamu</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}><Download size={14} />JSON</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <span className="text-xs text-gray-500">Disimpan di browser (localStorage)</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="target-income"
              label="Target Income per Bulan (Rp)"
              type="number"
              min="0"
              value={data.targetIncome}
              onChange={e => setData({ ...data, targetIncome: e.target.value })}
              hint={`= ${formatRupiah(targetIncome)}`}
            />
            <div className={inputClass}>
              <Input
                id="working-days"
                label="Hari Kerja per Bulan"
                type="number"
                min="1"
                max="31"
                value={data.workingDays}
                onChange={e => setData({ ...data, workingDays: e.target.value })}
              />
              <Input
                id="hours-per-day"
                label="Jam Kerja per Hari"
                type="number"
                min="1"
                max="24"
                value={data.hoursPerDay}
                onChange={e => setData({ ...data, hoursPerDay: e.target.value })}
              />
            </div>
            <Input
              id="overhead"
              label="Overhead per Bulan (Rp)"
              type="number"
              min="0"
              value={data.overhead}
              onChange={e => setData({ ...data, overhead: e.target.value })}
              hint="Biaya operasional: software, server, listrik, dll"
            />
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1.5">
                Buffer Margin: <span className="text-emerald-400 font-bold">{data.bufferPercent}%</span>
              </label>
              <input
                type="range" min="0" max="100" step="5"
                value={data.bufferPercent}
                onChange={e => setData({ ...data, bufferPercent: e.target.value })}
                className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Tambahan untuk ketidakpastian, revisi, waktu non-billable</p>
            </div>
            <Button onClick={handleSave} className="w-full" variant={saved ? 'secondary' : 'primary'}>
              {saved ? '✓ Tersimpan!' : 'Simpan ke Browser'}
            </Button>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <div className="flex flex-col gap-4">
          {/* Hasil utama */}
          <Card className="border-emerald-800/60 bg-emerald-950/10">
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-1">Ideal Hourly Rate Kamu</p>
                <p className="text-5xl font-black text-emerald-400">{formatRupiah(idealHourlyRate)}</p>
                <p className="text-gray-500 text-sm mt-1">per jam</p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: `${marketPos.color}20`, color: marketPos.color }}>
                  <TrendingUp size={14} />
                  {marketPos.label}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Rate Harian" value={formatRupiah(minDailyRate)} subtitle={`${hoursPerDay} jam/hari`} />
            <StatCard title="Project 3 Hari" value={formatRupiah(minProjectRate3Days)} subtitle="minimum" />
            <StatCard title="Project 1 Minggu" value={formatRupiah(minProjectRate1Week)} subtitle="minimum" />
            <StatCard title="Total Jam/Bulan" value={`${totalHoursPerMonth} jam`} subtitle={`${workingDays}d × ${hoursPerDay}h`} />
          </div>

          {/* Market comparison */}
          <Card>
            <CardHeader><CardTitle>Perbandingan Market Indonesia</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {MARKET_RATES.map(m => {
                const myRatePct = Math.min((idealHourlyRate / m.max) * 100, 100)
                const inRange = idealHourlyRate >= m.min && idealHourlyRate < m.max
                return (
                  <div key={m.level}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className={`font-medium ${inRange ? 'text-white' : 'text-gray-400'}`}>
                        {inRange && '→ '}{m.level}
                      </span>
                      <span className="text-gray-500">{formatRupiah(m.min)} – {formatRupiah(m.max)}/jam</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${Math.min((m.max / MARKET_RATES[2].max) * 100, 100)}%`, backgroundColor: `${m.color}40` }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-gray-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Rate kamu:</span>
                  <span className="font-bold" style={{ color: marketPos.color }}>{formatRupiah(idealHourlyRate)}/jam ({marketPos.label})</span>
                </div>
              </div>
              <ErrorBanner type="info" message="Angka market berdasarkan survei freelancer Indonesia 2024. Bisa berbeda tergantung niche dan portfolio." />
            </CardContent>
          </Card>

          {/* Breakdown formula */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Info size={16} />Formula Kalkulasi</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2 text-gray-400">
              <div className="flex justify-between"><span>Target income</span><span className="text-white">{formatRupiah(targetIncome)}</span></div>
              <div className="flex justify-between"><span>+ Overhead</span><span className="text-white">{formatRupiah(overhead)}</span></div>
              <div className="flex justify-between border-t border-gray-800 pt-2"><span>= Total kebutuhan</span><span className="text-white font-semibold">{formatRupiah(totalNeeded)}</span></div>
              <div className="flex justify-between"><span>÷ {totalHoursPerMonth} jam/bulan</span><span className="text-white">{formatRupiah(baseHourlyRate)}/jam</span></div>
              <div className="flex justify-between"><span>× buffer {bufferPercent}%</span><span className="text-emerald-400 font-bold">{formatRupiah(idealHourlyRate)}/jam</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
