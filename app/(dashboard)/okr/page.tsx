'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { v2Api } from '@/lib/v2-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { exportToCSV, formatTanggalIndonesia } from '@/lib/export'
import { Plus, Download, Trash2, Edit2, Target, CheckCircle, Circle, Clock, ChevronDown, ChevronRight } from 'lucide-react'

type OKRStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed'

interface OKR {
  [key: string]: unknown
  id: string
  title: string
  description: string | null
  quarter: string
  year: number
  status: OKRStatus
  progress: number
  due_date: string | null
  key_results: KeyResult[]
  created_at: string
}

interface KeyResult {
  [key: string]: unknown
  id: string
  okr_id: string
  title: string
  target: number
  current: number
  unit: string
  is_done: boolean
}

const STATUS_CONFIG: Record<OKRStatus, { label: string; color: string; bg: string }> = {
  'on-track': { label: 'On Track', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-700' },
  'at-risk': { label: 'At Risk', color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-700' },
  'off-track': { label: 'Off Track', color: 'text-red-400', bg: 'bg-red-950/40 border-red-700' },
  'completed': { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-700' },
}

const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ value: q, label: q }))
const STATUS_OPTIONS: { value: OKRStatus; label: string }[] = [
  { value: 'on-track', label: '🟢 On Track' },
  { value: 'at-risk', label: '🟡 At Risk' },
  { value: 'off-track', label: '🔴 Off Track' },
  { value: 'completed', label: '✅ Completed' },
]

export default function OKRPage() {
  const [okrs, setOKRs] = useState<OKR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [okrModal, setOKRModal] = useState(false)
  const [krModal, setKRModal] = useState(false)
  const [editingOKR, setEditingOKR] = useState<OKR | null>(null)
  const [selectedOKRId, setSelectedOKRId] = useState('')
  const [expandedOKRs, setExpandedOKRs] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`

  const [okrForm, setOKRForm] = useState({
    title: '', description: '', quarter: currentQuarter,
    year: String(currentYear), status: 'on-track' as OKRStatus,
    progress: '0', due_date: '',
  })
  const [krForm, setKRForm] = useState({ title: '', target: '', current: '0', unit: 'angka' })

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const okrData = await v2Api.list<OKR>('okrs')
      setOKRs(okrData)
    } catch (err) {
      setError('Gagal memuat OKR.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ============================================================
  // OKR CRUD
  // ============================================================
  async function handleSaveOKR(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!okrForm.title.trim()) { setFormError('Judul OKR wajib diisi'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        title: okrForm.title,
        description: okrForm.description || null,
        quarter: okrForm.quarter,
        year: parseInt(okrForm.year),
        status: okrForm.status,
        progress: parseInt(okrForm.progress) || 0,
        due_date: okrForm.due_date || null,
      }

      if (editingOKR) {
        await v2Api.update('okrs', editingOKR.id, payload)
      } else {
        await v2Api.create('okrs', payload)
      }

      setOKRModal(false)
      setEditingOKR(null)
      resetOKRForm()
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan OKR.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteOKR(id: string) {
    try {
      await v2Api.removeWhere('key_results', { okr_id: id })
      await v2Api.remove('okrs', id)
      setOKRs(prev => prev.filter(o => o.id !== id))
      setDeleteId(null)
    } catch { setError('Gagal menghapus OKR.') }
  }

  // ============================================================
  // Key Results CRUD
  // ============================================================
  async function handleSaveKR(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!krForm.title.trim()) { setFormError('Judul Key Result wajib diisi'); return }
    if (!krForm.target) { setFormError('Target wajib diisi'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await v2Api.create('key_results', {
        okr_id: selectedOKRId,
        title: krForm.title,
        target: parseFloat(krForm.target),
        current: parseFloat(krForm.current) || 0,
        unit: krForm.unit,
        is_done: false,
      })

      setKRModal(false)
      setKRForm({ title: '', target: '', current: '0', unit: 'angka' })
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan Key Result.')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateKRProgress(krId: string, current: number, target: number) {
    const isDone = current >= target
    await v2Api.update('key_results', krId, { current, is_done: isDone })
    setOKRs(prev => prev.map(o => ({
      ...o,
      key_results: o.key_results.map(kr => kr.id === krId ? { ...kr, current, is_done: isDone } : kr),
    })))
  }

  async function toggleKRDone(kr: KeyResult) {
    const newDone = !kr.is_done
    const newCurrent = newDone ? kr.target : kr.current
    await v2Api.update('key_results', kr.id, { is_done: newDone, current: newCurrent })
    setOKRs(prev => prev.map(o => ({
      ...o,
      key_results: o.key_results.map(k => k.id === kr.id ? { ...k, is_done: newDone, current: newCurrent } : k),
    })))
  }

  async function deleteKR(id: string) {
    await v2Api.remove('key_results', id)
    setOKRs(prev => prev.map(o => ({ ...o, key_results: o.key_results.filter(kr => kr.id !== id) })))
  }

  function resetOKRForm() {
    setOKRForm({ title: '', description: '', quarter: currentQuarter, year: String(currentYear), status: 'on-track', progress: '0', due_date: '' })
  }

  function toggleExpand(id: string) {
    setExpandedOKRs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ============================================================
  // Stats
  // ============================================================
  const totalOKRs = okrs.length
  const completedOKRs = okrs.filter(o => o.status === 'completed').length
  const onTrackOKRs = okrs.filter(o => o.status === 'on-track').length
  const avgProgress = okrs.length > 0
    ? Math.round(okrs.reduce((sum, o) => sum + (o.progress || 0), 0) / okrs.length)
    : 0
  const totalKRs = okrs.reduce((sum, o) => sum + o.key_results.length, 0)
  const doneKRs = okrs.reduce((sum, o) => sum + o.key_results.filter(kr => kr.is_done).length, 0)

  function handleExportCSV() {
    exportToCSV(okrs.map(o => ({
      quarter: `${o.quarter} ${o.year}`,
      objective: o.title,
      status: o.status,
      progress: o.progress,
      key_results: o.key_results.length,
      kr_done: o.key_results.filter(kr => kr.is_done).length,
    })), 'okr')
  }

  // Group by quarter/year
  const grouped = okrs.reduce<Record<string, OKR[]>>((acc, o) => {
    const key = `${o.quarter} ${o.year}`
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">OKR Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">Track Objectives & Key Results per kuartal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button size="sm" onClick={() => { resetOKRForm(); setEditingOKR(null); setFormError(''); setOKRModal(true) }}>
            <Plus size={14} />Tambah Objective
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Objectives" value={String(totalOKRs)} subtitle={`${onTrackOKRs} on track`} highlight icon={<Target size={18} />} />
        <StatCard title="Completed" value={String(completedOKRs)} subtitle={`dari ${totalOKRs} OKR`} icon={<CheckCircle size={18} />} />
        <StatCard title="Avg Progress" value={`${avgProgress}%`} subtitle="semua objective" icon={<Target size={18} />} />
        <StatCard title="Key Results" value={`${doneKRs}/${totalKRs}`} subtitle="selesai" icon={<CheckCircle size={18} />} />
      </div>

      {/* OKR List */}
      {loading ? <SkeletonTable rows={3} /> : okrs.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title="Belum ada OKR" description="Mulai set objectives untuk kuartal ini" actionLabel="Tambah Objective" onAction={() => { resetOKRForm(); setOKRModal(true) }} />
        </Card>
      ) : (
        Object.entries(grouped).map(([period, periodOKRs]) => (
          <div key={period}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{period}</h2>
            <div className="space-y-3">
              {periodOKRs.map(okr => {
                const isExpanded = expandedOKRs.has(okr.id)
                const cfg = STATUS_CONFIG[okr.status]
                const krProgress = okr.key_results.length > 0
                  ? Math.round((okr.key_results.filter(kr => kr.is_done).length / okr.key_results.length) * 100)
                  : okr.progress

                return (
                  <Card key={okr.id} className={`border ${isExpanded ? 'border-gray-700' : 'border-gray-800'}`}>
                    {/* OKR Header */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-800/30 transition-colors rounded-t-xl"
                      onClick={() => toggleExpand(okr.id)}
                    >
                      <div className="shrink-0">
                        {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-white font-semibold">{okr.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        {okr.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{okr.description}</p>}
                        {/* Progress bar */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${okr.status === 'completed' ? 'bg-blue-400' : okr.status === 'at-risk' ? 'bg-yellow-400' : okr.status === 'off-track' ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${krProgress}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{krProgress}%</span>
                          <span className="text-xs text-gray-600 shrink-0">{okr.key_results.filter(kr => kr.is_done).length}/{okr.key_results.length} KR</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={e => { e.stopPropagation(); setEditingOKR(okr); setOKRForm({ title: okr.title, description: okr.description || '', quarter: okr.quarter, year: String(okr.year), status: okr.status, progress: String(okr.progress), due_date: okr.due_date || '' }); setFormError(''); setOKRModal(true) }} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleteId(okr.id) }} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Key Results (collapsed/expanded) */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 px-4 py-3 space-y-2">
                        {okr.key_results.map(kr => {
                          const pct = kr.target > 0 ? Math.min((kr.current / kr.target) * 100, 100) : 0
                          return (
                            <div key={kr.id} className="flex items-center gap-3 group">
                              <button onClick={() => toggleKRDone(kr)} className="shrink-0 text-gray-500 hover:text-emerald-400 transition-colors">
                                {kr.is_done ? <CheckCircle size={16} className="text-emerald-400" /> : <Circle size={16} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm ${kr.is_done ? 'line-through text-gray-500' : 'text-gray-300'}`}>{kr.title}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex-1 bg-gray-800 rounded-full h-1">
                                    <div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500 shrink-0">{kr.current}/{kr.target} {kr.unit}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { const v = prompt(`Update current value (max: ${kr.target}):`, String(kr.current)); if (v !== null) updateKRProgress(kr.id, Math.min(parseFloat(v) || 0, kr.target), kr.target) }} className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400 hover:bg-gray-700">
                                  Update
                                </button>
                                <button onClick={() => deleteKR(kr.id)} className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}

                        <button
                          onClick={() => { setSelectedOKRId(okr.id); setKRForm({ title: '', target: '', current: '0', unit: 'angka' }); setFormError(''); setKRModal(true) }}
                          className="flex items-center gap-2 text-xs text-gray-500 hover:text-emerald-400 transition-colors mt-2 pt-2 border-t border-gray-800/50 w-full"
                        >
                          <Plus size={12} />Tambah Key Result
                        </button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal OKR */}
      <Modal isOpen={okrModal} onClose={() => { setOKRModal(false); setEditingOKR(null) }} title={editingOKR ? 'Edit Objective' : 'Tambah Objective'}>
        <form onSubmit={handleSaveOKR} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <Input id="okr-title" label="Objective" placeholder="Capai revenue Rp 50 juta per bulan" value={okrForm.title} onChange={e => setOKRForm({ ...okrForm, title: e.target.value })} required />
          <Textarea id="okr-desc" label="Deskripsi (opsional)" placeholder="Konteks atau cara mencapai objective ini..." value={okrForm.description} onChange={e => setOKRForm({ ...okrForm, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <Select id="okr-quarter" label="Quarter" value={okrForm.quarter} onChange={e => setOKRForm({ ...okrForm, quarter: e.target.value })} options={QUARTER_OPTIONS} />
            <Input id="okr-year" label="Tahun" type="number" min="2024" max="2030" value={okrForm.year} onChange={e => setOKRForm({ ...okrForm, year: e.target.value })} />
            <Select id="okr-status" label="Status" value={okrForm.status} onChange={e => setOKRForm({ ...okrForm, status: e.target.value as OKRStatus })} options={STATUS_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1.5">Progress: <span className="text-emerald-400">{okrForm.progress}%</span></label>
              <input type="range" min="0" max="100" step="5" value={okrForm.progress} onChange={e => setOKRForm({ ...okrForm, progress: e.target.value })} className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
            </div>
            <Input id="okr-due" label="Due Date (opsional)" type="date" value={okrForm.due_date} onChange={e => setOKRForm({ ...okrForm, due_date: e.target.value })} />
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setOKRModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>{editingOKR ? 'Update' : 'Simpan'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Key Result */}
      <Modal isOpen={krModal} onClose={() => setKRModal(false)} title="Tambah Key Result" size="sm">
        <form onSubmit={handleSaveKR} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <Input id="kr-title" label="Key Result" placeholder="Tutup 5 klien baru" value={krForm.title} onChange={e => setKRForm({ ...krForm, title: e.target.value })} required />
          <div className="grid grid-cols-3 gap-3">
            <Input id="kr-current" label="Saat ini" type="number" min="0" value={krForm.current} onChange={e => setKRForm({ ...krForm, current: e.target.value })} />
            <Input id="kr-target" label="Target" type="number" min="1" placeholder="5" value={krForm.target} onChange={e => setKRForm({ ...krForm, target: e.target.value })} required />
            <Input id="kr-unit" label="Satuan" placeholder="klien / Rp / %" value={krForm.unit} onChange={e => setKRForm({ ...krForm, unit: e.target.value })} />
          </div>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setKRModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>Simpan</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus OKR" size="sm">
        <p className="text-gray-300 text-sm">Hapus objective beserta semua key results-nya?</p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deleteId && handleDeleteOKR(deleteId)}>Hapus</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
