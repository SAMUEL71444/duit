'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { v2Api } from '@/lib/v2-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat, formatTanggalIndonesia } from '@/lib/export'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus, Download, Trash2, RefreshCw, TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react'

const COLORS = ['#1D9E75', '#378ADD', '#BA7517', '#7C3AED', '#E24B4A', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6']

interface Portfolio {
  [key: string]: unknown
  id: string
  ticker: string
  lot: number
  avg_price: number
  buy_date: string
  notes: string | null
  current_price?: number | null
  change_pct?: number | null
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [form, setForm] = useState({ ticker: '', lot: '', avg_price: '', buy_date: new Date().toISOString().split('T')[0], notes: '' })

  const supabase = createClient()

  const fetchHoldings = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const data = await v2Api.list<Portfolio>('portfolio_holdings', { order: 'created_at' })
      setHoldings(data)
    } catch (err) {
      setError('Gagal memuat portfolio.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch current prices via server route
  const refreshPrices = useCallback(async (holdingsList?: Portfolio[]) => {
    const list = holdingsList || holdings
    if (list.length === 0) return
    setRefreshing(true)
    try {
      const tickers = [...new Set(list.map(h => h.ticker))].join(',')
      const res = await fetch(`/api/stocks?tickers=${encodeURIComponent(tickers)}`)
      if (!res.ok) throw new Error('Gagal fetch harga saham')
      const priceMap = await res.json()
      setHoldings(prev => prev.map(h => ({
        ...h,
        current_price: priceMap[h.ticker]?.price ?? null,
        change_pct: priceMap[h.ticker]?.changePct ?? null,
      })))
      setLastRefresh(new Date())
    } catch (err) {
      setError('Gagal update harga. Coba refresh manual.')
    } finally {
      setRefreshing(false)
    }
  }, [holdings])

  useEffect(() => {
    fetchHoldings().then(() => {
      // Auto-refresh prices after holdings loaded
    })
  }, [fetchHoldings])

  // Refresh prices when holdings change
  useEffect(() => {
    if (holdings.length > 0 && !holdings[0].current_price) {
      refreshPrices(holdings)
    }
  }, [holdings.length])

  // ============================================================
  // Add holding
  // ============================================================
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const ticker = form.ticker.trim().toUpperCase()
    const lot = parseInt(form.lot)
    const avg_price = parseFloat(form.avg_price.replace(/\D/g, ''))

    if (!ticker) { setFormError('Ticker wajib diisi'); return }
    if (!lot || lot <= 0) { setFormError('Lot harus lebih dari 0'); return }
    if (!avg_price || avg_price <= 0) { setFormError('Harga beli harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      await v2Api.create('portfolio_holdings', {
        ticker,
        lot,
        avg_price,
        buy_date: form.buy_date,
        notes: form.notes || null,
      })
      setAddModal(false)
      setForm({ ticker: '', lot: '', avg_price: '', buy_date: new Date().toISOString().split('T')[0], notes: '' })
      fetchHoldings()
    } catch (err) {
      setFormError('Gagal menambah holding.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await v2Api.remove('portfolio_holdings', id)
      setHoldings(prev => prev.filter(h => h.id !== id))
      setDeleteId(null)
    } catch { setError('Gagal menghapus holding.') }
  }

  // ============================================================
  // Kalkulasi client-side
  // ============================================================
  const totalModal = holdings.reduce((sum, h) => sum + h.lot * 100 * h.avg_price, 0)
  const totalNilaiSekarang = holdings.reduce((sum, h) => {
    const harga = h.current_price ?? h.avg_price
    return sum + h.lot * 100 * harga
  }, 0)
  const totalPL = totalNilaiSekarang - totalModal
  const totalPLPct = totalModal > 0 ? (totalPL / totalModal) * 100 : 0

  const holdingsWithCalc = holdings.map(h => {
    const saham = h.lot * 100
    const modal = saham * h.avg_price
    const hargaSekarang = h.current_price ?? h.avg_price
    const nilaiSekarang = saham * hargaSekarang
    const pl = nilaiSekarang - modal
    const plPct = modal > 0 ? (pl / modal) * 100 : 0
    return { ...h, saham, modal, nilaiSekarang, pl, plPct }
  })

  const pieData = holdingsWithCalc.map((h, i) => ({
    name: h.ticker,
    value: h.nilaiSekarang,
    color: COLORS[i % COLORS.length],
  }))

  const barData = holdingsWithCalc.map(h => ({
    ticker: h.ticker,
    'P&L (Rp)': Math.round(h.pl),
    fill: h.pl >= 0 ? '#1D9E75' : '#E24B4A',
  }))

  function handleExportCSV() {
    exportToCSV(holdingsWithCalc.map(h => ({
      ticker: h.ticker,
      lot: h.lot,
      saham: h.saham,
      harga_beli: h.avg_price,
      harga_sekarang: h.current_price || '-',
      modal: h.modal,
      nilai_sekarang: h.nilaiSekarang,
      pl: h.pl,
      pl_persen: h.plPct.toFixed(2),
      tanggal_beli: h.buy_date,
    })), 'portfolio')
  }

  function handleExportJSON() {
    exportToJSON({ holdings: holdingsWithCalc, summary: { totalModal, totalNilaiSekarang, totalPL, totalPLPct } }, 'portfolio')
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track investasi saham IDX kamu
            {lastRefresh && <span className="ml-2 text-gray-600">· Update: {lastRefresh.toLocaleTimeString('id-ID')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refreshPrices()} isLoading={refreshing}>
            <RefreshCw size={14} />{refreshing ? 'Mengupdate...' : 'Refresh Harga'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}><Download size={14} />JSON</Button>
          <Button size="sm" onClick={() => { setFormError(''); setAddModal(true) }}>
            <Plus size={14} />Tambah Saham
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Modal" value={formatRupiahSingkat(totalModal)} subtitle={`${holdings.length} saham`} highlight icon={<Wallet size={18} />} />
          <StatCard title="Nilai Sekarang" value={formatRupiahSingkat(totalNilaiSekarang)} subtitle="Live price" icon={<BarChart2 size={18} />} />
          <StatCard
            title="Total P&L"
            value={formatRupiahSingkat(Math.abs(totalPL))}
            subtitle={`${totalPL >= 0 ? '+' : '-'}${Math.abs(totalPLPct).toFixed(2)}%`}
            icon={totalPL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          />
          <StatCard title="Jumlah Emiten" value={String(new Set(holdings.map(h => h.ticker)).size)} subtitle="ticker berbeda" icon={<BarChart2 size={18} />} />
        </div>
      )}

      {/* Holdings + Charts */}
      {!loading && holdings.length === 0 ? (
        <Card>
          <EmptyState icon={TrendingUp} title="Portfolio kosong" description="Tambah saham pertama untuk mulai track portfolio kamu" actionLabel="Tambah Saham" onAction={() => setAddModal(true)} />
        </Card>
      ) : !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holdings Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-2 text-gray-400 font-medium">Saham</th>
                        <th className="text-right py-3 px-2 text-gray-400 font-medium">Lot</th>
                        <th className="text-right py-3 px-2 text-gray-400 font-medium">Avg Buy</th>
                        <th className="text-right py-3 px-2 text-gray-400 font-medium">Harga</th>
                        <th className="text-right py-3 px-2 text-gray-400 font-medium">P&L</th>
                        <th className="py-3 px-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {holdingsWithCalc.map((h, i) => (
                        <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <div>
                                <p className="text-white font-bold">{h.ticker}</p>
                                <p className="text-gray-500 text-xs">{h.saham.toLocaleString()} lbr</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-300">{h.lot}</td>
                          <td className="py-3 px-2 text-right text-gray-300">{formatRupiah(h.avg_price)}</td>
                          <td className="py-3 px-2 text-right">
                            {h.current_price ? (
                              <div>
                                <p className="text-white font-semibold">{formatRupiah(h.current_price)}</p>
                                {h.change_pct != null && (
                                  <p className={`text-xs ${h.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {h.change_pct >= 0 ? '+' : ''}{h.change_pct.toFixed(2)}%
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <p className={`font-semibold ${h.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {h.pl >= 0 ? '+' : ''}{formatRupiah(Math.round(h.pl))}
                            </p>
                            <p className={`text-xs ${h.pl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {h.plPct >= 0 ? '+' : ''}{h.plPct.toFixed(2)}%
                            </p>
                          </td>
                          <td className="py-3 px-2">
                            <button onClick={() => setDeleteId(h.id)} className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-700">
                        <td colSpan={4} className="py-3 px-2 text-gray-400 font-semibold">Total</td>
                        <td className="py-3 px-2 text-right">
                          <p className={`font-bold text-base ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalPL >= 0 ? '+' : ''}{formatRupiah(Math.round(totalPL))}
                          </p>
                          <p className={`text-xs ${totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(2)}%
                          </p>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts sidebar */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader><CardTitle>Alokasi Portfolio</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {holdingsWithCalc.map((h, i) => (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-400">{h.ticker}</span>
                      </div>
                      <span className="text-gray-300">{totalNilaiSekarang > 0 ? ((h.nilaiSekarang / totalNilaiSekarang) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>P&L per Saham</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={v => formatRupiahSingkat(v)} />
                    <YAxis type="category" dataKey="ticker" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={50} />
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                    <Bar dataKey="P&L (Rp)" radius={4}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Add */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setFormError('') }} title="Tambah Saham">
        <form onSubmit={handleAdd} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input id="port-ticker" label="Ticker IDX" placeholder="BBCA / TLKM / GOTO" value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} hint="Tanpa .JK — otomatis ditambahkan" />
            <Input id="port-lot" label="Jumlah Lot" type="number" min="1" placeholder="10" value={form.lot} onChange={e => setForm({ ...form, lot: e.target.value })} />
          </div>
          <Input id="port-price" label="Harga Beli Rata-rata (Rp)" type="number" min="1" placeholder="9500" value={form.avg_price} onChange={e => setForm({ ...form, avg_price: e.target.value })} hint="Harga per lembar (1 lot = 100 lembar)" />
          <Input id="port-date" label="Tanggal Beli" type="date" value={form.buy_date} onChange={e => setForm({ ...form, buy_date: e.target.value })} />
          <Input id="port-notes" label="Catatan (opsional)" placeholder="Kenapa beli saham ini..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setAddModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>Tambah</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Holding" size="sm">
        <p className="text-gray-300 text-sm">Yakin ingin menghapus saham ini dari portfolio?</p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
