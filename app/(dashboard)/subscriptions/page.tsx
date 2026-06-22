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
import { Plus, Download, Trash2, Edit2, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface Subscription {
  [key: string]: unknown
  id: string
  name: string
  cost: number
  billing_cycle: 'monthly' | 'yearly'
  category: string
  is_active: boolean
  next_billing: string | null
  last_used: string | null
  notes: string | null
}

const CATEGORIES = [
  { value: 'dev-tools', label: '💻 Dev Tools' },
  { value: 'design', label: '🎨 Design' },
  { value: 'productivity', label: '⚡ Produktivitas' },
  { value: 'ai', label: '🤖 AI & LLM' },
  { value: 'hosting', label: '☁️ Hosting & Cloud' },
  { value: 'security', label: '🔐 Security' },
  { value: 'marketing', label: '📣 Marketing' },
  { value: 'finance', label: '💰 Finance' },
  { value: 'other', label: '📦 Lainnya' },
]

const CAT_ICONS: Record<string, string> = {
  'dev-tools': '💻', design: '🎨', productivity: '⚡', ai: '🤖',
  hosting: '☁️', security: '🔐', marketing: '📣', finance: '💰', other: '📦',
}

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    name: '', cost: '', billing_cycle: 'monthly' as 'monthly' | 'yearly',
    category: 'dev-tools', next_billing: '', last_used: '', notes: '',
  })

  const supabase = createClient()

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const data = await v2Api.list<Subscription>('subscriptions', { order: 'cost', asc: 'false' })
      setSubs(data)
    } catch { setError('Gagal memuat data langganan.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  function resetForm() {
    setForm({ name: '', cost: '', billing_cycle: 'monthly', category: 'dev-tools', next_billing: '', last_used: '', notes: '' })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('Nama layanan wajib diisi'); return }
    const cost = parseFloat(form.cost)
    if (!cost || cost <= 0) { setFormError('Biaya harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const payload = {
        name: form.name, cost, billing_cycle: form.billing_cycle,
        category: form.category, is_active: true,
        next_billing: form.next_billing || null,
        last_used: form.last_used || null,
        notes: form.notes || null,
      }
      if (editing) {
        await v2Api.update('subscriptions', editing.id, payload)
      } else {
        await v2Api.create('subscriptions', payload)
      }
      setAddModal(false)
      setEditing(null)
      resetForm()
      fetchSubs()
    } catch { setFormError('Gagal menyimpan langganan.') }
    finally { setSubmitting(false) }
  }

  async function toggleActive(sub: Subscription) {
    await v2Api.update('subscriptions', sub.id, { is_active: !sub.is_active })
    setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: !s.is_active } : s))
  }

  async function handleDelete(id: string) {
    await v2Api.remove('subscriptions', id)
    setSubs(prev => prev.filter(s => s.id !== id))
    setDeleteId(null)
  }

  // ============================================================
  // Kalkulasi
  // ============================================================
  const active = subs.filter(s => s.is_active)
  const inactive = subs.filter(s => !s.is_active)

  const monthlyTotal = active.reduce((sum, s) => {
    return sum + (s.billing_cycle === 'monthly' ? s.cost : s.cost / 12)
  }, 0)
  const yearlyTotal = monthlyTotal * 12

  // Langganan yang jarang dipakai (last_used > 30 hari)
  const today = new Date()
  const rarely = active.filter(s => {
    if (!s.last_used) return false
    const daysSince = Math.floor((today.getTime() - new Date(s.last_used).getTime()) / (1000 * 60 * 60 * 24))
    return daysSince > 30
  })

  // Penghematan potensial jika hapus yang jarang dipakai
  const potentialSaving = rarely.reduce((sum, s) => sum + (s.billing_cycle === 'monthly' ? s.cost : s.cost / 12), 0)

  // Billing bulan ini (next_billing dalam 7 hari)
  const upcoming = active.filter(s => {
    if (!s.next_billing) return false
    const diff = Math.floor((new Date(s.next_billing).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7
  })

  // By category
  const byCat = active.reduce<Record<string, { count: number; cost: number }>>((acc, s) => {
    const monthly = s.billing_cycle === 'monthly' ? s.cost : s.cost / 12
    if (!acc[s.category]) acc[s.category] = { count: 0, cost: 0 }
    acc[s.category].count++
    acc[s.category].cost += monthly
    return acc
  }, {})

  function handleExportCSV() {
    exportToCSV(subs.map(s => ({
      nama: s.name, kategori: s.category, biaya: s.cost,
      siklus: s.billing_cycle, aktif: s.is_active ? 'ya' : 'tidak',
      biaya_bulanan: s.billing_cycle === 'monthly' ? s.cost : s.cost / 12,
    })), 'subscriptions')
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Audit</h1>
          <p className="text-gray-400 text-sm mt-1">Audit semua langganan tool kamu — temukan yang bisa dihemat</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          <Button size="sm" onClick={() => { resetForm(); setEditing(null); setFormError(''); setAddModal(true) }}>
            <Plus size={14} />Tambah Langganan
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}
      {upcoming.length > 0 && (
        <ErrorBanner type="warning" title={`${upcoming.length} tagihan dalam 7 hari!`} message={upcoming.map(s => `${s.name}: ${formatRupiah(s.cost)} (${formatTanggalIndonesia(s.next_billing!)})`).join(' · ')} />
      )}
      {rarely.length > 0 && (
        <ErrorBanner type="info" title={`${rarely.length} langganan jarang dipakai`} message={`Potensial hemat ${formatRupiah(Math.round(potentialSaving))}/bulan kalau dihentikan: ${rarely.map(s => s.name).join(', ')}`} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total per Bulan" value={formatRupiah(Math.round(monthlyTotal))} subtitle={`${active.length} langganan aktif`} highlight icon={<TrendingUp size={18} />} />
        <StatCard title="Total per Tahun" value={formatRupiahSingkat(yearlyTotal)} subtitle="proyeksi tahunan" icon={<TrendingUp size={18} />} />
        <StatCard title="Jarang Dipakai" value={String(rarely.length)} subtitle={`hemat ${formatRupiah(Math.round(potentialSaving))}/bln`} icon={<AlertTriangle size={18} />} />
        <StatCard title="Nonaktif" value={String(inactive.length)} subtitle="diarsipkan" icon={<XCircle size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Daftar Langganan Aktif</CardTitle><span className="text-sm text-gray-500">{active.length} aktif · {inactive.length} nonaktif</span></CardHeader>
            <CardContent>
              {loading ? <SkeletonTable rows={5} /> : subs.length === 0 ? (
                <EmptyState icon={TrendingUp} title="Belum ada langganan" description="Tambah semua tool berbayar yang kamu gunakan" actionLabel="Tambah Langganan" onAction={() => setAddModal(true)} />
              ) : (
                <div className="space-y-2">
                  {subs.map(s => {
                    const monthly = s.billing_cycle === 'monthly' ? s.cost : s.cost / 12
                    const isRarely = rarely.find(r => r.id === s.id)
                    return (
                      <div key={s.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors group ${!s.is_active ? 'opacity-50 border-gray-800/50' : isRarely ? 'border-yellow-800/50 bg-yellow-950/10' : 'border-gray-800 hover:border-gray-700'}`}>
                        <div className="text-2xl shrink-0">{CAT_ICONS[s.category] || '📦'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold text-sm">{s.name}</p>
                            {isRarely && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-950/50 text-yellow-500 border border-yellow-900">Jarang dipakai</span>}
                          </div>
                          <p className="text-gray-500 text-xs">{s.billing_cycle === 'monthly' ? 'Bulanan' : 'Tahunan'} · {s.last_used ? `Terakhir: ${formatTanggalIndonesia(s.last_used)}` : 'Belum dicatat'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-bold text-sm">{formatRupiah(Math.round(monthly))}<span className="text-gray-500 font-normal">/bln</span></p>
                          {s.billing_cycle === 'yearly' && <p className="text-gray-600 text-xs">{formatRupiah(s.cost)}/thn</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => toggleActive(s)} className={`text-xs px-2 py-0.5 rounded-full border ${s.is_active ? 'border-emerald-700 text-emerald-400' : 'border-gray-700 text-gray-500'}`}>
                            {s.is_active ? 'Aktif' : 'Off'}
                          </button>
                          <button onClick={() => { setEditing(s); setForm({ name: s.name, cost: String(s.cost), billing_cycle: s.billing_cycle, category: s.category, next_billing: s.next_billing || '', last_used: s.last_used || '', notes: s.notes || '' }); setFormError(''); setAddModal(true) }} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Breakdown per kategori */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Per Kategori</CardTitle></CardHeader>
            <CardContent>
              {Object.entries(byCat).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byCat).sort(([, a], [, b]) => b.cost - a.cost).map(([cat, { count, cost }]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{CAT_ICONS[cat]} {cat}</span>
                        <span className="text-white font-semibold">{formatRupiah(Math.round(cost))}/bln</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${monthlyTotal > 0 ? (cost / monthlyTotal) * 100 : 0}%` }} />
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{count} layanan · {monthlyTotal > 0 ? ((cost / monthlyTotal) * 100).toFixed(1) : 0}%</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {rarely.length > 0 && (
            <Card className="border-yellow-800/50">
              <CardHeader><CardTitle className="flex items-center gap-2 text-yellow-400"><AlertTriangle size={16} />Kandidat Cancel</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rarely.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{s.name}</span>
                      <span className="text-yellow-400 font-semibold">{formatRupiah(Math.round(s.billing_cycle === 'monthly' ? s.cost : s.cost / 12))}/bln</span>
                    </div>
                  ))}
                  <div className="border-t border-yellow-900/50 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-yellow-400">Hemat total</span>
                    <span className="text-yellow-400">{formatRupiah(Math.round(potentialSaving))}/bln</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setEditing(null) }} title={editing ? `Edit — ${editing.name}` : 'Tambah Langganan'}>
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input id="sub-name" label="Nama Layanan" placeholder="Vercel / ChatGPT / Figma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Select id="sub-cat" label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="sub-cost" label="Biaya (Rp)" type="number" min="0" placeholder="149000" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} required />
            <Select id="sub-cycle" label="Siklus Billing" value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value as 'monthly' | 'yearly' })} options={BILLING_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="sub-next" label="Tagihan Berikutnya" type="date" value={form.next_billing} onChange={e => setForm({ ...form, next_billing: e.target.value })} />
            <Input id="sub-last" label="Terakhir Digunakan" type="date" value={form.last_used} onChange={e => setForm({ ...form, last_used: e.target.value })} />
          </div>
          <Input id="sub-notes" label="Catatan (opsional)" placeholder="Pakai untuk apa..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setAddModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>{editing ? 'Update' : 'Simpan'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Langganan" size="sm">
        <p className="text-gray-300 text-sm">Yakin ingin menghapus langganan ini?</p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
