'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { v2Api } from '@/lib/v2-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat, formatTanggalIndonesia } from '@/lib/export'
import { Plus, Download, Trash2, Edit2, Bell, BellOff, TrendingUp, Calendar, RefreshCw } from 'lucide-react'

interface DCASchedule {
  id: string
  ticker: string
  budget: number
  day_of_month: number
  is_active: boolean
  notes: string | null
}

interface DCAExecution {
  [key: string]: unknown
  id: string
  schedule_id: string
  executed_date: string
  price_per_share: number
  shares_bought: number
  total_cost: number
  notes: string | null
}

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Tanggal ${i + 1}` }))

export default function DCAPage() {
  const [schedules, setSchedules] = useState<DCASchedule[]>([])
  const [executions, setExecutions] = useState<DCAExecution[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [scheduleModal, setScheduleModal] = useState(false)
  const [execModal, setExecModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<DCASchedule | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [schedForm, setSchedForm] = useState({ ticker: '', budget: '', day_of_month: '1', notes: '' })
  const [execForm, setExecForm] = useState({ schedule_id: '', price_per_share: '', shares_bought: '', executed_date: new Date().toISOString().split('T')[0], notes: '' })

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [schedsRes, execs] = await Promise.all([
        supabase.from('dca_schedules').select('*').eq('user_id', user.id).order('created_at'),
        v2Api.list<DCAExecution>('dca_executions', { order: 'executed_date', asc: 'false' }),
      ])
      if (schedsRes.error) throw schedsRes.error
      setSchedules(schedsRes.data || [])
      setExecutions(execs)
    } catch (err) {
      setError('Gagal memuat data DCA.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch harga saham untuk semua ticker aktif
  const refreshPrices = useCallback(async () => {
    const activeTickers = schedules.filter(s => s.is_active).map(s => s.ticker)
    if (activeTickers.length === 0) return
    setRefreshing(true)
    try {
      const res = await fetch(`/api/stocks?tickers=${[...new Set(activeTickers)].join(',')}`)
      if (!res.ok) return
      const data = await res.json()
      const priceMap: Record<string, number> = {}
      Object.entries(data).forEach(([ticker, info]: [string, any]) => {
        if (info.price) priceMap[ticker] = info.price
      })
      setPrices(priceMap)
    } catch { /* ignore price errors */ } finally {
      setRefreshing(false)
    }
  }, [schedules])

  useEffect(() => { if (schedules.length > 0) refreshPrices() }, [schedules.length])

  // ============================================================
  // Schedule CRUD
  // ============================================================
  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const ticker = schedForm.ticker.trim().toUpperCase()
    const budget = parseFloat(schedForm.budget)
    const day = parseInt(schedForm.day_of_month)

    if (!ticker) { setFormError('Ticker wajib diisi'); return }
    if (!budget || budget <= 0) { setFormError('Budget harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const payload = { ticker, budget, day_of_month: day, notes: schedForm.notes || null }

      if (editingSchedule) {
        const { error } = await supabase.from('dca_schedules').update(payload).eq('id', editingSchedule.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('dca_schedules').insert({ ...payload, user_id: user.id, is_active: true })
        if (error) throw error
      }
      setScheduleModal(false)
      setEditingSchedule(null)
      setSchedForm({ ticker: '', budget: '', day_of_month: '1', notes: '' })
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan jadwal.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(schedule: DCASchedule) {
    try {
      await supabase.from('dca_schedules').update({ is_active: !schedule.is_active }).eq('id', schedule.id)
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s))
    } catch { setError('Gagal update status.') }
  }

  async function handleDeleteSchedule(id: string) {
    try {
      await v2Api.removeWhere('dca_executions', { schedule_id: id })
      await supabase.from('dca_schedules').delete().eq('id', id)
      setSchedules(prev => prev.filter(s => s.id !== id))
      setExecutions(prev => prev.filter(e => e.schedule_id !== id))
      setDeleteId(null)
    } catch { setError('Gagal menghapus jadwal.') }
  }

  // ============================================================
  // Catat Eksekusi
  // ============================================================
  async function handleSaveExec(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const price = parseFloat(execForm.price_per_share)
    const shares = parseInt(execForm.shares_bought)

    if (!execForm.schedule_id) { setFormError('Pilih jadwal DCA'); return }
    if (!price || price <= 0) { setFormError('Harga harus lebih dari 0'); return }
    if (!shares || shares <= 0) { setFormError('Jumlah lembar harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const total_cost = price * shares
      await v2Api.create('dca_executions', {
        schedule_id: execForm.schedule_id,
        price_per_share: price,
        shares_bought: shares,
        total_cost,
        executed_date: execForm.executed_date,
        notes: execForm.notes || null,
      })
      setExecModal(false)
      setExecForm({ schedule_id: '', price_per_share: '', shares_bought: '', executed_date: new Date().toISOString().split('T')[0], notes: '' })
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan eksekusi.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // Kalkulasi
  // ============================================================
  const totalBudgetPerBulan = schedules.filter(s => s.is_active).reduce((sum, s) => sum + s.budget, 0)
  const totalInvested = executions.reduce((sum, e) => sum + e.total_cost, 0)
  const totalShares = executions.reduce((sum, e) => sum + e.shares_bought, 0)
  const avgBuyPrice = totalShares > 0 ? totalInvested / totalShares : 0

  // Current value dari semua eksekusi
  const scheduleMap = Object.fromEntries(schedules.map(s => [s.id, s]))
  const currentValue = executions.reduce((sum, e) => {
    const ticker = scheduleMap[e.schedule_id]?.ticker
    const price = ticker ? (prices[ticker] || e.price_per_share) : e.price_per_share
    return sum + e.shares_bought * price
  }, 0)
  const totalPL = currentValue - totalInvested

  const scheduleOptions = schedules.map(s => ({ value: s.id, label: `${s.ticker} (${formatRupiah(s.budget)}/bulan, tgl ${s.day_of_month})` }))

  function handleExportCSV() { exportToCSV(executions.map(e => ({ tanggal: e.executed_date, schedule_id: e.schedule_id, harga: e.price_per_share, lembar: e.shares_bought, total: e.total_cost })), 'dca-executions') }
  function handleExportJSON() { exportToJSON({ schedules, executions }, 'dca') }

  const today = new Date().getDate()
  const dueTodaySchedules = schedules.filter(s => s.is_active && s.day_of_month === today)
  const dueSoonSchedules = schedules.filter(s => s.is_active && Math.abs(s.day_of_month - today) <= 2 && s.day_of_month !== today)

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">DCA Scheduler</h1>
          <p className="text-gray-400 text-sm mt-1">Dollar Cost Averaging — jadwal beli rutin saham IDX</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refreshPrices} isLoading={refreshing}><RefreshCw size={14} />Harga</Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}><Download size={14} />JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => { setFormError(''); setExecModal(true) }}><Plus size={14} />Catat Beli</Button>
          <Button size="sm" onClick={() => { setEditingSchedule(null); setSchedForm({ ticker: '', budget: '', day_of_month: '1', notes: '' }); setFormError(''); setScheduleModal(true) }}><Plus size={14} />Jadwal DCA</Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}
      {dueTodaySchedules.length > 0 && (
        <ErrorBanner type="warning" title={`${dueTodaySchedules.length} jadwal DCA hari ini!`} message={`${dueTodaySchedules.map(s => `${s.ticker} (${formatRupiah(s.budget)})`).join(', ')} — jangan lupa eksekusi!`} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Budget per Bulan" value={formatRupiahSingkat(totalBudgetPerBulan)} subtitle={`${schedules.filter(s => s.is_active).length} jadwal aktif`} highlight icon={<Calendar size={18} />} />
        <StatCard title="Total Diinvestasikan" value={formatRupiahSingkat(totalInvested)} subtitle={`${executions.length} eksekusi`} icon={<TrendingUp size={18} />} />
        <StatCard title="Nilai Sekarang" value={formatRupiahSingkat(currentValue)} subtitle="Live price" icon={<TrendingUp size={18} />} />
        <StatCard title="Total P&L" value={formatRupiahSingkat(Math.abs(totalPL))} subtitle={totalPL >= 0 ? `+${((totalPL/Math.max(totalInvested,1))*100).toFixed(1)}%` : `-${((Math.abs(totalPL)/Math.max(totalInvested,1))*100).toFixed(1)}%`} icon={<TrendingUp size={18} />} />
      </div>

      {/* Jadwal DCA */}
      <Card>
        <CardHeader>
          <CardTitle>Jadwal DCA Aktif</CardTitle>
          <span className="text-sm text-gray-500">{schedules.length} jadwal</span>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonTable rows={3} /> : schedules.length === 0 ? (
            <EmptyState icon={Calendar} title="Belum ada jadwal DCA" description="Tambah jadwal untuk mulai DCA rutin" actionLabel="Tambah Jadwal" onAction={() => setScheduleModal(true)} />
          ) : (
            <div className="space-y-3">
              {schedules.map(s => {
                const execCount = executions.filter(e => e.schedule_id === s.id).length
                const totalSpent = executions.filter(e => e.schedule_id === s.id).reduce((sum, e) => sum + e.total_cost, 0)
                const currentPrice = prices[s.ticker]
                const isDueToday = s.is_active && s.day_of_month === today
                const isDueSoon = s.is_active && dueSoonSchedules.find(d => d.id === s.id)

                return (
                  <div key={s.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isDueToday ? 'border-yellow-700/60 bg-yellow-950/20' : s.is_active ? 'border-gray-800 bg-gray-800/30' : 'border-gray-800/50 bg-gray-900/30 opacity-60'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${s.is_active ? 'bg-emerald-950/50 border border-emerald-800/50' : 'bg-gray-800 border border-gray-700'}`}>
                        {s.is_active ? <Bell size={18} className="text-emerald-400" /> : <BellOff size={18} className="text-gray-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold">{s.ticker}</p>
                          {isDueToday && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-800">Hari ini!</span>}
                        </div>
                        <p className="text-gray-400 text-sm">{formatRupiah(s.budget)}/bulan · Tgl {s.day_of_month}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{execCount}x eksekusi · Total {formatRupiah(totalSpent)}{currentPrice ? ` · Live: ${formatRupiah(currentPrice)}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(s)} className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${s.is_active ? 'border-emerald-700 text-emerald-400 hover:bg-emerald-950/30' : 'border-gray-700 text-gray-500 hover:bg-gray-800'}`}>
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                      <button onClick={() => { setEditingSchedule(s); setSchedForm({ ticker: s.ticker, budget: String(s.budget), day_of_month: String(s.day_of_month), notes: s.notes || '' }); setFormError(''); setScheduleModal(true) }} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riwayat Eksekusi */}
      {executions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Riwayat Eksekusi DCA</CardTitle><span className="text-sm text-gray-500">{executions.length} transaksi</span></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Saham</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Harga/lbr</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Lembar</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Total</th>
                    <th className="py-3 px-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {executions.slice(0, 30).map(e => {
                    const ticker = scheduleMap[e.schedule_id]?.ticker || '?'
                    return (
                      <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-2 text-gray-300">{formatTanggalIndonesia(e.executed_date)}</td>
                        <td className="py-3 px-2 text-white font-bold">{ticker}</td>
                        <td className="py-3 px-2 text-right text-gray-300">{formatRupiah(e.price_per_share)}</td>
                        <td className="py-3 px-2 text-right text-gray-300">{e.shares_bought.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-2 text-right text-emerald-400 font-semibold">{formatRupiah(e.total_cost)}</td>
                        <td className="py-3 px-2">
                          <button onClick={async () => { await v2Api.remove('dca_executions', e.id); fetchData() }} className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <Modal isOpen={scheduleModal} onClose={() => { setScheduleModal(false); setEditingSchedule(null) }} title={editingSchedule ? `Edit Jadwal — ${editingSchedule.ticker}` : 'Tambah Jadwal DCA'}>
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input id="dca-ticker" label="Ticker IDX" placeholder="BBCA / TLKM" value={schedForm.ticker} onChange={e => setSchedForm({ ...schedForm, ticker: e.target.value.toUpperCase() })} disabled={!!editingSchedule} />
            <Select id="dca-day" label="Tanggal Eksekusi" value={schedForm.day_of_month} onChange={e => setSchedForm({ ...schedForm, day_of_month: e.target.value })} options={DAY_OPTIONS} />
          </div>
          <Input id="dca-budget" label="Budget per Eksekusi (Rp)" type="number" min="1" placeholder="1000000" value={schedForm.budget} onChange={e => setSchedForm({ ...schedForm, budget: e.target.value })} hint="Jumlah Rp yang mau diinvestasikan setiap bulan" />
          <Input id="dca-notes" label="Catatan (opsional)" placeholder="Strategi DCA ini..." value={schedForm.notes} onChange={e => setSchedForm({ ...schedForm, notes: e.target.value })} />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setScheduleModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>{editingSchedule ? 'Update' : 'Simpan'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={execModal} onClose={() => { setExecModal(false); setFormError('') }} title="Catat Eksekusi DCA">
        <form onSubmit={handleSaveExec} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <Select id="exec-sched" label="Jadwal DCA" value={execForm.schedule_id} onChange={e => setExecForm({ ...execForm, schedule_id: e.target.value })} options={[{ value: '', label: '— Pilih Jadwal —' }, ...scheduleOptions]} />
          <div className="grid grid-cols-2 gap-4">
            <Input id="exec-price" label="Harga per Lembar (Rp)" type="number" min="1" placeholder="9450" value={execForm.price_per_share} onChange={e => setExecForm({ ...execForm, price_per_share: e.target.value })} />
            <Input id="exec-shares" label="Jumlah Lembar Dibeli" type="number" min="1" placeholder="100" value={execForm.shares_bought} onChange={e => setExecForm({ ...execForm, shares_bought: e.target.value })} />
          </div>
          {execForm.price_per_share && execForm.shares_bought && (
            <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/50 text-sm">
              Total: <span className="text-emerald-400 font-bold">{formatRupiah(parseFloat(execForm.price_per_share) * parseInt(execForm.shares_bought) || 0)}</span>
            </div>
          )}
          <Input id="exec-date" label="Tanggal Beli" type="date" value={execForm.executed_date} onChange={e => setExecForm({ ...execForm, executed_date: e.target.value })} />
          <Input id="exec-notes" label="Catatan (opsional)" placeholder="Broker, kondisi market..." value={execForm.notes} onChange={e => setExecForm({ ...execForm, notes: e.target.value })} />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setExecModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>Simpan</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Jadwal" size="sm">
        <p className="text-gray-300 text-sm">Hapus jadwal DCA ini beserta semua riwayat eksekusinya?</p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deleteId && handleDeleteSchedule(deleteId)}>Hapus</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
