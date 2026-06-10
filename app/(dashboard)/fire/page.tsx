'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { ErrorBanner } from '@/components/ui/error-banner'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat } from '@/lib/export'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Download, Flame, Target, Clock, TrendingUp } from 'lucide-react'

const STORAGE_KEY = 'fire_calculator_data'

interface FireData {
  monthlyExpense: string
  currentAssets: string
  monthlySaving: string
  expectedReturn: string
  safeWithdrawalRate: string
  inflationRate: string
}

const DEFAULT: FireData = {
  monthlyExpense: '15000000',
  currentAssets: '100000000',
  monthlySaving: '8000000',
  expectedReturn: '10',
  safeWithdrawalRate: '4',
  inflationRate: '3.5',
}

export default function FIREPage() {
  const [data, setData] = useState<FireData>(DEFAULT)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) { try { setData(JSON.parse(stored)) } catch { /* ignore */ } }
  }, [])

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ============================================================
  // Kalkulasi FIRE — client-side murni
  // ============================================================
  const monthlyExpense = parseFloat(data.monthlyExpense) || 0
  const currentAssets = parseFloat(data.currentAssets) || 0
  const monthlySaving = parseFloat(data.monthlySaving) || 0
  const annualReturn = parseFloat(data.expectedReturn) / 100
  const swr = parseFloat(data.safeWithdrawalRate) / 100
  const inflation = parseFloat(data.inflationRate) / 100

  const annualExpense = monthlyExpense * 12
  const realReturn = ((1 + annualReturn) / (1 + inflation)) - 1
  const fireNumber = swr > 0 ? annualExpense / swr : 0

  // Simulasi year-by-year
  const projectionData: { year: number; aset: number; fireTarget: number; label: string }[] = []
  let aset = currentAssets
  let fireYear = null
  const monthlyReturn = annualReturn / 12
  const maxYears = 40

  for (let yr = 0; yr <= maxYears; yr++) {
    projectionData.push({
      year: new Date().getFullYear() + yr,
      aset: Math.round(aset),
      fireTarget: Math.round(fireNumber),
      label: `${yr}th`,
    })
    if (aset >= fireNumber && fireYear === null && yr > 0) {
      fireYear = yr
    }
    // Compound monthly
    for (let m = 0; m < 12; m++) {
      aset = aset * (1 + monthlyReturn) + monthlySaving
    }
    if (aset >= fireNumber * 2) break // Stop simulation kalau sudah 2x FIRE number
  }

  const yearsToFIRE = fireYear
  const fireDate = yearsToFIRE !== null
    ? new Date(new Date().getFullYear() + yearsToFIRE, new Date().getMonth()).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : null

  const passiveIncomeSekarang = currentAssets * swr / 12
  const progressPercent = fireNumber > 0 ? Math.min((currentAssets / fireNumber) * 100, 100) : 0

  // Monthly withdrawal at FIRE
  const monthlyWithdrawalAtFIRE = fireNumber * swr / 12

  function handleExportCSV() {
    exportToCSV(projectionData.map(p => ({
      tahun: p.year,
      proyeksi_aset: p.aset,
      fire_target: p.fireTarget,
    })), 'fire-projection')
  }

  function handleExportJSON() {
    exportToJSON({ input: data, fireNumber, yearsToFIRE, fireDate, projection: projectionData }, 'fire-calculator')
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Flame size={24} className="text-orange-400" />FIRE Calculator</h1>
          <p className="text-gray-400 text-sm mt-1">Financial Independence, Retire Early — estimasi waktu dan target kebebasan finansial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}><Download size={14} />JSON</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader><CardTitle>Parameter FIRE</CardTitle><span className="text-xs text-gray-500">Tersimpan di browser</span></CardHeader>
          <CardContent className="space-y-4">
            <Input id="fire-expense" label="Pengeluaran Bulanan (Rp)" type="number" value={data.monthlyExpense} onChange={e => setData({ ...data, monthlyExpense: e.target.value })} hint={`= ${formatRupiah(monthlyExpense)}/bulan, ${formatRupiah(annualExpense)}/tahun`} />
            <Input id="fire-assets" label="Total Aset Sekarang (Rp)" type="number" value={data.currentAssets} onChange={e => setData({ ...data, currentAssets: e.target.value })} hint={`= ${formatRupiahSingkat(currentAssets)}`} />
            <Input id="fire-saving" label="Tabungan/Investasi per Bulan (Rp)" type="number" value={data.monthlySaving} onChange={e => setData({ ...data, monthlySaving: e.target.value })} hint={`= ${formatRupiah(monthlySaving)}/bulan`} />

            <div className="grid grid-cols-3 gap-3">
              <Input id="fire-return" label="Return/tahun (%)" type="number" step="0.5" value={data.expectedReturn} onChange={e => setData({ ...data, expectedReturn: e.target.value })} hint="IHSG avg ~10%" />
              <Input id="fire-swr" label="SWR (%)" type="number" step="0.5" value={data.safeWithdrawalRate} onChange={e => setData({ ...data, safeWithdrawalRate: e.target.value })} hint="Rule of 4%" />
              <Input id="fire-inflation" label="Inflasi (%)" type="number" step="0.5" value={data.inflationRate} onChange={e => setData({ ...data, inflationRate: e.target.value })} hint="BPS ~3.5%" />
            </div>

            <Button onClick={handleSave} className="w-full" variant={saved ? 'secondary' : 'primary'}>
              {saved ? '✓ Tersimpan!' : 'Simpan ke Browser'}
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <div className="flex flex-col gap-4">
          {/* FIRE Number highlight */}
          <Card className="border-orange-800/50 bg-orange-950/10">
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-1">FIRE Number Kamu</p>
                <p className="text-5xl font-black text-orange-400">{formatRupiahSingkat(fireNumber)}</p>
                <p className="text-gray-500 text-sm mt-1">= {formatRupiah(fireNumber)}</p>
                {yearsToFIRE !== null ? (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-sm font-semibold">
                    <Flame size={14} />FIRE dalam {yearsToFIRE} tahun ({fireDate})
                  </div>
                ) : (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/50 border border-red-800/60 text-red-400 text-sm">
                    <Clock size={14} />Belum tercapai dalam 40 tahun — naikkan tabungan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress bar */}
          <Card>
            <CardHeader><CardTitle>Progress Menuju FIRE</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Aset sekarang</span>
                <span className="text-white font-semibold">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>{formatRupiahSingkat(currentAssets)}</span>
                <span>Target: {formatRupiahSingkat(fireNumber)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Passive Income Sekarang" value={formatRupiah(Math.round(passiveIncomeSekarang))} subtitle="per bulan (dari aset)" />
            <StatCard title="Passive Income saat FIRE" value={formatRupiah(Math.round(monthlyWithdrawalAtFIRE))} subtitle={`SWR ${data.safeWithdrawalRate}%`} />
            <StatCard title="Real Return" value={`${(realReturn * 100).toFixed(2)}%`} subtitle="setelah inflasi" />
            <StatCard title="Lama FIRE" value={yearsToFIRE !== null ? `${yearsToFIRE} tahun` : '>40 tahun'} subtitle="dari sekarang" />
          </div>
        </div>
      </div>

      {/* Proyeksi Chart */}
      {projectionData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={18} />Proyeksi Pertumbuhan Aset</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={v => formatRupiahSingkat(v)} width={72} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                  formatter={(v: unknown) => formatRupiah(Number(v))}
                />
                <ReferenceLine y={fireNumber} stroke="#F97316" strokeDasharray="6 3" label={{ value: 'FIRE Target', fill: '#F97316', fontSize: 11 }} />
                <Line type="monotone" dataKey="aset" stroke="#1D9E75" strokeWidth={2.5} dot={false} name="Proyeksi Aset" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <ErrorBanner type="info" title="Catatan Penting" message="Kalkulasi ini bersifat estimasi. Safe Withdrawal Rate 4% berdasarkan Trinity Study (pasar AS). Untuk Indonesia, pertimbangkan SWR 3–3.5% karena risiko inflasi dan volatilitas lebih tinggi. Konsultasikan dengan perencana keuangan untuk keputusan besar." />
    </div>
  )
}
