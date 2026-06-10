'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonStatCards, SkeletonTable } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat, formatTanggalIndonesia } from '@/lib/export'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Plus, Download, Trash2,
  DollarSign, Calendar, Tag, FileText,
} from 'lucide-react'

const SOURCE_OPTIONS = [
  { value: 'freelance', label: 'Freelance' },
  { value: 'bounty', label: 'Bug Bounty' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'investasi', label: 'Investasi' },
  { value: 'lain', label: 'Lain-lain' },
]

const SOURCE_COLORS: Record<string, string> = {
  freelance: '#1D9E75',
  bounty: '#378ADD',
  affiliate: '#BA7517',
  investasi: '#7C3AED',
  lain: '#6B7280',
}

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

interface IncomeEntry {
  id: string
  amount: number
  source: string
  date: string
  notes: string | null
  created_at: string
}

interface FormData {
  amount: string
  source: string
  date: string
  notes: string
}

export default function RevenuePage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    amount: '',
    source: 'freelance',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [formError, setFormError] = useState('')

  const supabase = createClient()

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('income_entries')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      setError('Gagal memuat data income. Coba refresh halaman.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // ============================================================
  // Kalkulasi — semua di client-side
  // ============================================================
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const thisMonthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const lastMonthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  })

  const totalThisMonth = thisMonthEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalLastMonth = lastMonthEntries.reduce((sum, e) => sum + e.amount, 0)
  const growth =
    totalLastMonth > 0
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
      : totalThisMonth > 0
      ? 100
      : 0

  // Top income stream bulan ini
  const streamTotals = thisMonthEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + e.amount
    return acc
  }, {})
  const topStream = Object.entries(streamTotals).sort(([, a], [, b]) => b - a)[0]

  // Proyeksi (berdasarkan rata-rata harian × sisa hari)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate()
  const proyeksi =
    dayOfMonth > 0 ? Math.round((totalThisMonth / dayOfMonth) * daysInMonth) : 0

  // Data per stream untuk pie chart (bulan ini)
  const pieData = Object.entries(streamTotals).map(([source, amount]) => ({
    name: SOURCE_OPTIONS.find((s) => s.value === source)?.label || source,
    value: amount,
    source,
  }))

  // Tren 6 bulan
  const trend6Months = Array.from({ length: 6 }, (_, i) => {
    const monthOffset = 5 - i
    const d = new Date(thisYear, thisMonth - monthOffset, 1)
    const m = d.getMonth()
    const y = d.getFullYear()
    const total = entries
      .filter((e) => {
        const ed = new Date(e.date)
        return ed.getMonth() === m && ed.getFullYear() === y
      })
      .reduce((sum, e) => sum + e.amount, 0)

    return {
      bulan: BULAN_PENDEK[m],
      total,
    }
  })

  // Bar chart per stream (bulan ini)
  const barData = SOURCE_OPTIONS.map((s) => ({
    name: s.label,
    total: streamTotals[s.value] || 0,
    source: s.value,
  })).filter((d) => d.total > 0)

  // ============================================================
  // Form handlers
  // ============================================================
  function resetForm() {
    setForm({
      amount: '',
      source: 'freelance',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setFormError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const amount = parseInt(form.amount.replace(/\D/g, ''), 10)
    if (!amount || amount <= 0) {
      setFormError('Masukkan jumlah income yang valid')
      return
    }
    if (!form.date) {
      setFormError('Tanggal wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Tidak ada sesi login')

      const { error } = await supabase.from('income_entries').insert({
        user_id: user.id,
        amount,
        source: form.source,
        date: form.date,
        notes: form.notes || null,
      })

      if (error) throw error

      setModalOpen(false)
      resetForm()
      fetchEntries()
    } catch (err) {
      setFormError('Gagal menyimpan. Coba lagi.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('income_entries').delete().eq('id', id)
      if (error) throw error
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setDeleteId(null)
    } catch {
      setError('Gagal menghapus entry.')
    }
  }

  // ============================================================
  // Export
  // ============================================================
  function handleExportCSV() {
    exportToCSV(
      entries.map((e) => ({
        tanggal: e.date,
        jumlah: e.amount,
        sumber: e.source,
        catatan: e.notes || '',
      })),
      `income-${thisYear}`
    )
  }

  function handleExportJSON() {
    exportToJSON(entries, `income-${thisYear}`)
  }

  // ============================================================
  // Custom Tooltip Recharts
  // ============================================================
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm">
          <p className="text-gray-400 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }} className="font-semibold">
              {formatRupiah(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Pulse</h1>
          <p className="text-gray-400 text-sm mt-1">
            Semua income kamu dalam satu tempat
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download size={14} />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download size={14} />
            JSON
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} />
            Tambah Income
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Stat Cards */}
      {loading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Bulan Ini"
            value={formatRupiahSingkat(totalThisMonth)}
            highlight
            trend={growth}
            trendLabel="vs bulan lalu"
            icon={<DollarSign size={18} />}
          />
          <StatCard
            title="Growth"
            value={`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
            subtitle={`vs ${BULAN_PENDEK[lastMonth]}`}
            icon={growth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          />
          <StatCard
            title="Top Stream"
            value={topStream ? SOURCE_OPTIONS.find((s) => s.value === topStream[0])?.label || topStream[0] : '—'}
            subtitle={topStream ? formatRupiahSingkat(topStream[1]) : 'Belum ada data'}
            icon={<Tag size={18} />}
          />
          <StatCard
            title="Proyeksi Bulan Ini"
            value={formatRupiahSingkat(proyeksi)}
            subtitle={`Berdasarkan ${dayOfMonth} hari`}
            icon={<Calendar size={18} />}
          />
        </div>
      )}

      {/* Charts */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Line Chart — Tren 6 bulan */}
          <Card>
            <CardHeader>
              <CardTitle>Tren 6 Bulan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend6Months}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bulan" />
                  <YAxis tickFormatter={(v) => formatRupiahSingkat(v).replace('Rp ', '')} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#1D9E75"
                    strokeWidth={2}
                    dot={{ fill: '#1D9E75', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart — Per stream bulan ini */}
          <Card>
            <CardHeader>
              <CardTitle>Per Stream — Bulan Ini</CardTitle>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => formatRupiahSingkat(v).replace('Rp ', '')} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell
                          key={entry.source}
                          fill={SOURCE_COLORS[entry.source] || '#6B7280'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">
                  Belum ada transaksi bulan ini
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart — Alokasi per stream */}
          {pieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Komposisi Stream</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.source}
                          fill={SOURCE_COLORS[entry.source] || '#6B7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabel */}
      <Card>
        <CardHeader>
          <CardTitle>Semua Transaksi</CardTitle>
          <span className="text-sm text-gray-500">{entries.length} entri</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Belum ada income tercatat"
              description="Mulai catat income pertama kamu untuk melihat analisis lengkap"
              actionLabel="Tambah Income"
              onAction={() => setModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Tanggal</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Sumber</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Jumlah</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium hidden md:table-cell">Catatan</th>
                    <th className="py-3 px-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-gray-300">
                        {formatTanggalIndonesia(entry.date)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${SOURCE_COLORS[entry.source]}20`,
                            color: SOURCE_COLORS[entry.source] || '#6B7280',
                          }}
                        >
                          {SOURCE_OPTIONS.find((s) => s.value === entry.source)?.label || entry.source}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-emerald-400">
                        {formatRupiah(entry.amount)}
                      </td>
                      <td className="py-3 px-2 text-gray-500 hidden md:table-cell max-w-[200px] truncate">
                        {entry.notes || '—'}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => setDeleteId(entry.id)}
                          className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        >
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

      {/* Modal — Tambah Income */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          resetForm()
        }}
        title="Tambah Income"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <ErrorBanner type="error" message={formError} />
          )}

          <Input
            id="income-amount"
            label="Jumlah (Rp)"
            placeholder="1500000"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            type="number"
            min="1"
            required
            hint="Masukkan angka tanpa titik/koma"
          />

          <Select
            id="income-source"
            label="Sumber Income"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={SOURCE_OPTIONS}
          />

          <Input
            id="income-date"
            label="Tanggal"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />

          <Textarea
            id="income-notes"
            label="Catatan (opsional)"
            placeholder="Misal: Proyek website klien ABC, payment milestone 1"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setModalOpen(false)
                resetForm()
              }}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={submitting}>
              Simpan
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal — Konfirmasi Hapus */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Hapus Income"
        size="sm"
      >
        <p className="text-gray-300 text-sm">
          Yakin ingin menghapus entri income ini? Aksi ini tidak bisa dibatalkan.
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Batal
          </Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>
            Ya, Hapus
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
