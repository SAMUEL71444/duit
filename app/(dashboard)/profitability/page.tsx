'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat, formatDurasi, formatTanggalIndonesia } from '@/lib/export'
import { Play, Pause, Square, Plus, Download, Clock, TrendingUp, Trash2, Timer } from 'lucide-react'

interface TimeLog {
  id: string
  deal_id: string | null
  project_name: string
  duration_seconds: number
  date: string
  notes: string | null
  created_at: string
}

interface CRMDeal {
  id: string
  client_name: string
  value: number | null
}

interface ProjectSummary {
  project_name: string
  total_seconds: number
  total_logs: number
  invoice: number
  hourly_rate: number
}

const STORAGE_KEY = 'rate_hourly_stored'

export default function ProfitabilityPage() {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [deals, setDeals] = useState<CRMDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerProject, setTimerProject] = useState('')
  const [timerDealId, setTimerDealId] = useState('')
  const [timerNotes, setTimerNotes] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Modal
  const [logModal, setLogModal] = useState(false)
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [invoiceProject, setInvoiceProject] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Rate dari localStorage (dari Rate Calculator)
  const [hourlyRate, setHourlyRate] = useState(0)

  // Manual log form
  const [logForm, setLogForm] = useState({
    project_name: '',
    deal_id: '',
    duration_hours: '',
    duration_minutes: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const supabase = createClient()

  // Ambil hourly rate dari localStorage Rate Calculator
  useEffect(() => {
    const stored = localStorage.getItem('rate_calculator_data')
    if (stored) {
      try {
        const d = JSON.parse(stored)
        const target = parseInt(d.targetIncome) || 0
        const overhead = parseInt(d.overhead) || 0
        const days = parseInt(d.workingDays) || 20
        const hours = parseInt(d.hoursPerDay) || 6
        const buffer = parseInt(d.bufferPercent) || 0
        const totalHours = days * hours
        const base = totalHours > 0 ? Math.ceil((target + overhead) / totalHours) : 0
        const rate = Math.ceil(base * (1 + buffer / 100))
        setHourlyRate(rate)
      } catch { /* ignore */ }
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [logsRes, dealsRes] = await Promise.all([
        supabase.from('time_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('crm_deals').select('id, client_name, value').eq('user_id', user.id).in('stage', ['Aktif', 'Negosiasi']),
      ])

      if (logsRes.error) throw logsRes.error
      if (dealsRes.error) throw dealsRes.error

      setLogs(logsRes.data || [])
      setDeals(dealsRes.data || [])
    } catch (err) {
      setError('Gagal memuat data. Coba refresh.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ============================================================
  // Timer
  // ============================================================
  function startTimer() {
    if (!timerProject.trim()) { setFormError('Isi nama project dulu'); return }
    setFormError('')
    setTimerRunning(true)
    intervalRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1)
    }, 1000)
  }

  function pauseTimer() {
    setTimerRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  async function stopTimer() {
    pauseTimer()
    if (timerSeconds < 10) { setTimerSeconds(0); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('time_logs').insert({
        user_id: user.id,
        deal_id: timerDealId || null,
        project_name: timerProject,
        duration_seconds: timerSeconds,
        date: new Date().toISOString().split('T')[0],
        notes: timerNotes || null,
      })
      if (error) throw error

      setTimerSeconds(0)
      setTimerProject('')
      setTimerDealId('')
      setTimerNotes('')
      fetchData()
    } catch (err) {
      setError('Gagal simpan sesi timer.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Cleanup interval on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // ============================================================
  // Manual log
  // ============================================================
  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!logForm.project_name.trim()) { setFormError('Nama project wajib diisi'); return }

    const hours = parseInt(logForm.duration_hours) || 0
    const minutes = parseInt(logForm.duration_minutes) || 0
    const totalSeconds = hours * 3600 + minutes * 60
    if (totalSeconds <= 0) { setFormError('Durasi harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('time_logs').insert({
        user_id: user.id,
        deal_id: logForm.deal_id || null,
        project_name: logForm.project_name,
        duration_seconds: totalSeconds,
        date: logForm.date,
        notes: logForm.notes || null,
      })
      if (error) throw error

      setLogModal(false)
      setLogForm({ project_name: '', deal_id: '', duration_hours: '', duration_minutes: '', date: new Date().toISOString().split('T')[0], notes: '' })
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan log.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteLog(id: string) {
    try {
      await supabase.from('time_logs').delete().eq('id', id)
      setLogs(prev => prev.filter(l => l.id !== id))
    } catch { setError('Gagal menghapus log.') }
  }

  // ============================================================
  // Kalkulasi per project — client-side
  // ============================================================
  const projectMap = logs.reduce<Record<string, { seconds: number; logs: number }>>((acc, log) => {
    const key = log.project_name
    if (!acc[key]) acc[key] = { seconds: 0, logs: 0 }
    acc[key].seconds += log.duration_seconds
    acc[key].logs += 1
    return acc
  }, {})

  const totalSeconds = logs.reduce((sum, l) => sum + l.duration_seconds, 0)
  const totalHours = totalSeconds / 3600
  const theoreticalIncome = Math.round(totalHours * hourlyRate)

  const projectSummaries: ProjectSummary[] = Object.entries(projectMap)
    .map(([name, { seconds, logs: logCount }]) => {
      const hours = seconds / 3600
      const deal = deals.find(d => logs.find(l => l.project_name === name && l.deal_id === d.id))
      const invoice = deal?.value || 0
      const hourly = hours > 0 && invoice > 0 ? Math.round(invoice / hours) : 0
      return { project_name: name, total_seconds: seconds, total_logs: logCount, invoice, hourly_rate: hourly }
    })
    .sort((a, b) => b.hourly_rate - a.hourly_rate)

  // Export
  function handleExportCSV() {
    exportToCSV(logs.map(l => ({
      tanggal: l.date,
      project: l.project_name,
      durasi_jam: (l.duration_seconds / 3600).toFixed(2),
      catatan: l.notes || '',
    })), 'time-logs')
  }

  function handleExportJSON() {
    exportToJSON({ logs, summaries: projectSummaries }, 'time-logs')
  }

  const dealOptions = [
    { value: '', label: '— Tidak terkait deal —' },
    ...deals.map(d => ({ value: d.id, label: `${d.client_name}${d.value ? ` (${formatRupiah(d.value)})` : ''}` })),
  ]

  // Timer display
  const timerHH = String(Math.floor(timerSeconds / 3600)).padStart(2, '0')
  const timerMM = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')
  const timerSS = String(timerSeconds % 60).padStart(2, '0')

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Project Profitability</h1>
          <p className="text-gray-400 text-sm mt-1">Track waktu kerja dan hitung profitabilitas per project</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}><Download size={14} />JSON</Button>
          <Button variant="secondary" size="sm" onClick={() => { setFormError(''); setLogModal(true) }}>
            <Plus size={14} />Log Manual
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}
      {hourlyRate === 0 && (
        <ErrorBanner type="warning" title="Hourly rate belum diset" message="Pergi ke Rate Calculator untuk set target income. Rate akan otomatis diambil dari sana." />
      )}

      {/* Timer Panel */}
      <Card className="border-emerald-800/40">
        <CardHeader><CardTitle className="flex items-center gap-2"><Timer size={18} />Timer Sesi Kerja</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Timer display */}
            <div className="flex flex-col items-center gap-4 lg:w-64 shrink-0">
              <div className={`text-6xl font-mono font-black tabular-nums ${timerRunning ? 'text-emerald-400' : timerSeconds > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {timerHH}:{timerMM}:{timerSS}
              </div>
              <div className="flex items-center gap-3">
                {!timerRunning ? (
                  <Button onClick={startTimer} size="lg" className="gap-2">
                    <Play size={18} />{timerSeconds > 0 ? 'Lanjutkan' : 'Mulai'}
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} size="lg" variant="secondary" className="gap-2">
                    <Pause size={18} />Pause
                  </Button>
                )}
                {timerSeconds > 0 && (
                  <Button onClick={stopTimer} variant="danger" size="lg" isLoading={submitting}>
                    <Square size={18} />Stop & Simpan
                  </Button>
                )}
              </div>
            </div>

            {/* Timer inputs */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {formError && <div className="sm:col-span-2"><ErrorBanner type="error" message={formError} /></div>}
              <Input
                id="timer-project"
                label="Nama Project"
                placeholder="Website PT Maju / Bug Bounty HackerOne"
                value={timerProject}
                onChange={e => setTimerProject(e.target.value)}
                disabled={timerRunning}
              />
              <Select
                id="timer-deal"
                label="Terkait Deal (opsional)"
                value={timerDealId}
                onChange={e => setTimerDealId(e.target.value)}
                options={dealOptions}
                disabled={timerRunning}
              />
              <Input
                id="timer-notes"
                label="Catatan sesi ini"
                placeholder="Yang dikerjakan hari ini..."
                value={timerNotes}
                onChange={e => setTimerNotes(e.target.value)}
              />
              {hourlyRate > 0 && timerSeconds > 0 && (
                <div className="flex items-center p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                  <div>
                    <p className="text-xs text-gray-400">Nilai sesi ini</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatRupiah(Math.round((timerSeconds / 3600) * hourlyRate))}
                    </p>
                    <p className="text-xs text-gray-500">@ {formatRupiah(hourlyRate)}/jam</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jam Tercatat" value={`${totalHours.toFixed(1)}j`} subtitle={`${logs.length} sesi`} highlight icon={<Clock size={18} />} />
        <StatCard title="Nilai Waktu" value={formatRupiahSingkat(theoreticalIncome)} subtitle={`@ ${formatRupiah(hourlyRate)}/jam`} icon={<TrendingUp size={18} />} />
        <StatCard title="Jumlah Project" value={String(Object.keys(projectMap).length)} subtitle="unik" icon={<Timer size={18} />} />
        <StatCard title="Rata-rata Harian" value={`${(totalHours / Math.max(new Set(logs.map(l => l.date)).size, 1)).toFixed(1)}j`} subtitle="per hari aktif" icon={<Clock size={18} />} />
      </div>

      {/* Project Summary Table */}
      {projectSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Profitabilitas per Project</CardTitle>
            <span className="text-xs text-gray-500">Diurutkan dari effective hourly rate tertinggi</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Project</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Total Waktu</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium hidden sm:table-cell">Invoice</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Effective Rate</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium hidden sm:table-cell">vs Target</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSummaries.map((p, i) => {
                    const effHours = p.total_seconds / 3600
                    const vsTarget = hourlyRate > 0 && p.hourly_rate > 0
                      ? ((p.hourly_rate - hourlyRate) / hourlyRate) * 100 : null
                    return (
                      <tr key={p.project_name} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-5">{i + 1}.</span>
                            <span className="text-white font-medium">{p.project_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-300">{formatDurasi(p.total_seconds)}</td>
                        <td className="py-3 px-2 text-right text-gray-300 hidden sm:table-cell">
                          {p.invoice > 0 ? formatRupiah(p.invoice) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold">
                          {p.hourly_rate > 0
                            ? <span className={p.hourly_rate >= hourlyRate ? 'text-emerald-400' : 'text-red-400'}>{formatRupiah(p.hourly_rate)}/j</span>
                            : <span className="text-gray-600 text-xs">Butuh invoice</span>
                          }
                        </td>
                        <td className="py-3 px-2 text-right hidden sm:table-cell">
                          {vsTarget !== null ? (
                            <span className={`text-xs font-medium ${vsTarget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(0)}%
                            </span>
                          ) : <span className="text-gray-600 text-xs">—</span>}
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

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Semua Time Log</CardTitle>
          <span className="text-sm text-gray-500">{logs.length} sesi</span>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonTable rows={5} /> : logs.length === 0 ? (
            <EmptyState icon={Clock} title="Belum ada log waktu" description="Mulai timer atau tambah log manual untuk track waktu kerja kamu" actionLabel="Log Manual" onAction={() => setLogModal(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Project</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Durasi</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium hidden md:table-cell">Catatan</th>
                    <th className="py-3 px-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-2 text-gray-300">{formatTanggalIndonesia(log.date)}</td>
                      <td className="py-3 px-2 text-white font-medium">{log.project_name}</td>
                      <td className="py-3 px-2 text-right text-emerald-400 font-mono">{formatDurasi(log.duration_seconds)}</td>
                      <td className="py-3 px-2 text-gray-500 hidden md:table-cell max-w-[200px] truncate">{log.notes || '—'}</td>
                      <td className="py-3 px-2">
                        <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Log Manual */}
      <Modal isOpen={logModal} onClose={() => { setLogModal(false); setFormError('') }} title="Tambah Log Manual" size="md">
        <form onSubmit={handleAddLog} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <Input id="log-project" label="Nama Project" placeholder="Website Klien ABC" value={logForm.project_name} onChange={e => setLogForm({ ...logForm, project_name: e.target.value })} required />
          <Select id="log-deal" label="Terkait Deal (opsional)" value={logForm.deal_id} onChange={e => setLogForm({ ...logForm, deal_id: e.target.value })} options={dealOptions} />
          <div className="grid grid-cols-2 gap-4">
            <Input id="log-hours" label="Jam" type="number" min="0" placeholder="2" value={logForm.duration_hours} onChange={e => setLogForm({ ...logForm, duration_hours: e.target.value })} />
            <Input id="log-minutes" label="Menit" type="number" min="0" max="59" placeholder="30" value={logForm.duration_minutes} onChange={e => setLogForm({ ...logForm, duration_minutes: e.target.value })} />
          </div>
          <Input id="log-date" label="Tanggal" type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} />
          <Textarea id="log-notes" label="Catatan (opsional)" placeholder="Yang dikerjakan..." value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} rows={2} />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setLogModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>Simpan</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
