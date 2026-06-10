'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { ErrorBanner } from '@/components/ui/error-banner'
import { exportToCSV, exportToJSON, formatRupiah, formatPersen } from '@/lib/export'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'

// Data inflasi BPS historis (hardcode — update tahunan)
const BPS_INFLATION_DATA: Record<number, number> = {
  2015: 3.35, 2016: 3.02, 2017: 3.61, 2018: 3.13,
  2019: 2.72, 2020: 1.68, 2021: 1.87, 2022: 5.51,
  2023: 2.61, 2024: 1.57,
}

const IHSG_RETURN_DATA: Record<number, number> = {
  2015: -12.13, 2016: 15.32, 2017: 19.99, 2018: -2.54,
  2019: 1.70, 2020: -5.09, 2021: 10.08, 2022: 4.09,
  2023: 6.16, 2024: -2.65,
}

interface InvestmentInput {
  investmentType: string
  annualReturn: string
  initialAmount: string
  startYear: string
  endYear: string
}

type ChartPoint = {
  year: number
  nominal: number
  real: number
  inflasi: number
}

export default function RealReturnPage() {
  const [form, setForm] = useState<InvestmentInput>({
    investmentType: 'custom',
    annualReturn: '12',
    initialAmount: '50000000',
    startYear: '2019',
    endYear: '2024',
  })
  const [useIHSG, setUseIHSG] = useState(false)

  // ============================================================
  // Kalkulasi client-side
  // ============================================================
  const startYear = Math.max(parseInt(form.startYear) || 2019, 2015)
  const endYear = Math.min(parseInt(form.endYear) || 2024, 2024)
  const initialAmount = parseFloat(form.initialAmount) || 0
  const customReturn = parseFloat(form.annualReturn) / 100

  // Hitung per tahun
  const chartData: ChartPoint[] = []
  let nominalValue = initialAmount
  let realValue = initialAmount
  let cumulativeInflation = 1

  for (let yr = startYear; yr <= endYear; yr++) {
    const inflation = (BPS_INFLATION_DATA[yr] || 3) / 100
    const grossReturn = useIHSG ? (IHSG_RETURN_DATA[yr] || 0) / 100 : customReturn

    nominalValue = nominalValue * (1 + grossReturn)
    cumulativeInflation *= (1 + inflation)
    realValue = nominalValue / cumulativeInflation

    chartData.push({
      year: yr,
      nominal: Math.round(nominalValue),
      real: Math.round(realValue),
      inflasi: Math.round(initialAmount * cumulativeInflation),
    })
  }

  const finalNominal = chartData[chartData.length - 1]?.nominal || initialAmount
  const finalReal = chartData[chartData.length - 1]?.real || initialAmount
  const finalInflasiValue = chartData[chartData.length - 1]?.inflasi || initialAmount

  const nominalReturn = initialAmount > 0 ? ((finalNominal - initialAmount) / initialAmount) * 100 : 0
  const realReturn = initialAmount > 0 ? ((finalReal - initialAmount) / initialAmount) * 100 : 0
  const inflationErosion = finalNominal - finalReal // berapa nilai yang "termakan" inflasi
  const isBeatingInflation = finalReal > initialAmount

  // Avg inflasi periode ini
  const years = endYear - startYear + 1
  const avgInflation = Object.entries(BPS_INFLATION_DATA)
    .filter(([yr]) => parseInt(yr) >= startYear && parseInt(yr) <= endYear)
    .reduce((sum, [, val]) => sum + val, 0) / years

  function handleExportCSV() {
    exportToCSV(chartData.map(d => ({
      tahun: d.year,
      nilai_nominal: d.nominal,
      nilai_riil: d.real,
      nilai_jika_hanya_inflasi: d.inflasi,
    })), 'real-return')
  }

  function handleExportJSON() {
    exportToJSON({ input: form, results: chartData, summary: { nominalReturn, realReturn, avgInflation } }, 'real-return')
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Real Return vs Inflasi</h1>
          <p className="text-gray-400 text-sm mt-1">Bandingkan return investasi vs inflasi BPS — seberapa besar daya beli kamu berkembang?</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}><Download size={14} />JSON</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <Card>
          <CardHeader><CardTitle>Parameter</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="rr-initial"
              label="Modal Awal (Rp)"
              type="number"
              value={form.initialAmount}
              onChange={e => setForm({ ...form, initialAmount: e.target.value })}
              hint={`= ${formatRupiah(initialAmount)}`}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input id="rr-start" label="Tahun Mulai" type="number" min="2015" max="2024" value={form.startYear} onChange={e => setForm({ ...form, startYear: e.target.value })} />
              <Input id="rr-end" label="Tahun Akhir" type="number" min="2015" max="2024" value={form.endYear} onChange={e => setForm({ ...form, endYear: e.target.value })} />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300 block">Return Investasi</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setUseIHSG(false)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${!useIHSG ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
                >
                  Custom (isi sendiri)
                </button>
                <button
                  onClick={() => setUseIHSG(true)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${useIHSG ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
                >
                  IHSG historis (data aktual {startYear}–{endYear})
                </button>
              </div>
            </div>

            {!useIHSG && (
              <Input
                id="rr-return"
                label="Return per Tahun (%)"
                type="number"
                step="0.5"
                value={form.annualReturn}
                onChange={e => setForm({ ...form, annualReturn: e.target.value })}
                hint="Reksa dana / deposito / saham individual"
              />
            )}

            <ErrorBanner type="info" message={`Data inflasi BPS: ${Object.entries(BPS_INFLATION_DATA).map(([yr, v]) => `${yr}: ${v}%`).join(', ')}`} />
          </CardContent>
        </Card>

        {/* Hasil */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Highlight result */}
          <Card className={`border-2 ${isBeatingInflation ? 'border-emerald-700/60 bg-emerald-950/10' : 'border-red-700/60 bg-red-950/10'}`}>
            <CardContent>
              <div className="text-center py-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-3 ${isBeatingInflation ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                  {isBeatingInflation ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {isBeatingInflation ? 'Mengalahkan inflasi! 🎯' : 'Kalah dari inflasi ⚠️'}
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nilai Nominal</p>
                    <p className="text-xl font-black text-white">{formatRupiah(finalNominal)}</p>
                    <p className="text-xs text-emerald-400 mt-1">+{nominalReturn.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nilai Riil</p>
                    <p className="text-xl font-black text-yellow-400">{formatRupiah(finalReal)}</p>
                    <p className={`text-xs mt-1 ${realReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{realReturn >= 0 ? '+' : ''}{realReturn.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tergerus Inflasi</p>
                    <p className="text-xl font-black text-red-400">{formatRupiah(inflationErosion)}</p>
                    <p className="text-xs text-gray-500 mt-1">daya beli hilang</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Modal Awal" value={formatRupiah(initialAmount)} subtitle="modal investasi" />
            <StatCard title="Avg Inflasi/tahun" value={`${avgInflation.toFixed(2)}%`} subtitle={`${startYear}–${endYear} (BPS)`} />
            <StatCard title="Real Return Total" value={`${realReturn.toFixed(2)}%`} subtitle="setelah inflasi" />
            <StatCard title="Ekuivalen Inflasi" value={formatRupiah(finalInflasiValue)} subtitle="jika hanya ikut inflasi" />
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Perbandingan Nilai Investasi vs Inflasi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={v => formatRupiah(v).replace('Rp\u00a0', 'Rp ')} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F9FAFB' }}
                  formatter={(v: unknown) => formatRupiah(Number(v))}
                />
                <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
                <Line type="monotone" dataKey="nominal" stroke="#1D9E75" strokeWidth={2.5} dot={false} name="Nilai Nominal" />
                <Line type="monotone" dataKey="real" stroke="#F59E0B" strokeWidth={2.5} dot={false} name="Nilai Riil (daya beli)" strokeDasharray="5 3" />
                <Line type="monotone" dataKey="inflasi" stroke="#E24B4A" strokeWidth={1.5} dot={false} name="Jika Hanya Inflasi" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-gray-500 text-center">
              <div className="flex items-center justify-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-400" />Nilai Nominal: uang yang kamu punya</div>
              <div className="flex items-center justify-center gap-1.5"><div className="w-3 h-0.5 bg-yellow-400" />Nilai Riil: daya beli sesungguhnya</div>
              <div className="flex items-center justify-center gap-1.5"><div className="w-3 h-0.5 bg-red-400" />Inflasi: kalau cuma simpan cash</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IHSG Historis table */}
      {useIHSG && (
        <Card>
          <CardHeader><CardTitle>Data IHSG & Inflasi Historis</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-gray-400">Tahun</th>
                    <th className="text-right py-2 px-3 text-gray-400">Return IHSG</th>
                    <th className="text-right py-2 px-3 text-gray-400">Inflasi BPS</th>
                    <th className="text-right py-2 px-3 text-gray-400">Real Return</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(IHSG_RETURN_DATA)
                    .filter(([yr]) => parseInt(yr) >= startYear && parseInt(yr) <= endYear)
                    .map(([yr, ret]) => {
                      const infl = BPS_INFLATION_DATA[parseInt(yr)] || 0
                      const real = ret - infl
                      return (
                        <tr key={yr} className="border-b border-gray-800/50">
                          <td className="py-2 px-3 text-white font-medium">{yr}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${ret >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right text-gray-400">{infl.toFixed(2)}%</td>
                          <td className={`py-2 px-3 text-right font-semibold ${real >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{real >= 0 ? '+' : ''}{real.toFixed(2)}%</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
