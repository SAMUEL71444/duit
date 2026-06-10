'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat } from '@/lib/export'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Plus, Download, Trash2, Wallet, AlertTriangle, TrendingDown, PlusCircle } from 'lucide-react'

const DEFAULT_CATEGORIES = [
  'Operasional',
  'Investasi',
  'Tabungan',
  'Eksperimen Bisnis',
  'Hiburan',
  'Darurat',
]

const CATEGORY_COLORS = [
  '#1D9E75', '#378ADD', '#BA7517', '#7C3AED', '#E24B4A', '#6B7280',
  '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899',
]

interface BudgetCategory {
  id: string
  name: string
  allocated: number
  month: string
  spent?: number
}

interface BudgetTransaction {
  id: string
  category_id: string
  amount: number
  description: string | null
  date: string
}

interface IncomeEntry {
  amount: number
  date: string
}

function getThisMonthISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function getThisMonthLabel() {
  const now = new Date()
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  return `${bulan[now.getMonth()]} ${now.getFullYear()}`
}

export default function BudgetPage() {
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [catModal, setCatModal] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState('')

  // Forms
  const [catForm, setCatForm] = useState({ name: DEFAULT_CATEGORIES[0], allocated: '', customName: '' })
  const [txForm, setTxForm] = useState({ category_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const supabase = createClient()
  const thisMonth = getThisMonthISO()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      // Fetch kategori bulan ini
      const { data: cats, error: catErr } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id)
        .gte('month', firstDay)
        .lte('month', lastDay)
        .order('created_at')

      if (catErr) throw catErr

      // Fetch transaksi bulan ini
      const { data: txs, error: txErr } = await supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false })

      if (txErr) throw txErr

      // Fetch total income bulan ini
      const { data: incomes, error: incErr } = await supabase
        .from('income_entries')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', firstDay)
        .lte('date', lastDay)

      if (incErr) throw incErr

      const income = (incomes as IncomeEntry[] || []).reduce((sum, e) => sum + e.amount, 0)
      setTotalIncome(income)

      // Hitung spent per kategori
      const spentMap: Record<string, number> = {}
      ;(txs || []).forEach((tx: BudgetTransaction) => {
        spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + tx.amount
      })

      const catsWithSpent = (cats || []).map((c: BudgetCategory) => ({
        ...c,
        spent: spentMap[c.id] || 0,
      }))

      setCategories(catsWithSpent)
      setTransactions(txs || [])
    } catch (err) {
      setError('Gagal memuat data budget. Coba refresh halaman.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ============================================================
  // Kalkulasi client-side
  // ============================================================
  const totalAllocated = categories.reduce((sum, c) => sum + c.allocated, 0)
  const totalSpent = categories.reduce((sum, c) => sum + (c.spent || 0), 0)
  const unallocated = totalIncome - totalAllocated
  const overspendCategories = categories.filter(c => (c.spent || 0) > c.allocated)

  // ============================================================
  // Tambah Kategori
  // ============================================================
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const name = catForm.name === '__custom' ? catForm.customName.trim() : catForm.name
    const allocated = parseInt(catForm.allocated.replace(/\D/g, ''), 10)

    if (!name) { setFormError('Nama kategori wajib diisi'); return }
    if (!allocated || allocated <= 0) { setFormError('Alokasi harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('budget_categories').insert({
        user_id: user.id,
        name,
        allocated,
        month: thisMonth,
      })
      if (error) throw error

      setCatModal(false)
      setCatForm({ name: DEFAULT_CATEGORIES[0], allocated: '', customName: '' })
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan kategori.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // Tambah Transaksi
  // ============================================================
  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const amount = parseInt(txForm.amount.replace(/\D/g, ''), 10)

    if (!txForm.category_id) { setFormError('Pilih kategori dulu'); return }
    if (!amount || amount <= 0) { setFormError('Jumlah harus lebih dari 0'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('budget_transactions').insert({
        user_id: user.id,
        category_id: txForm.category_id,
        amount,
        description: txForm.description || null,
        date: txForm.date,
      })
      if (error) throw error

      setTxModal(false)
      setTxForm({ category_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
      fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan transaksi.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // Hapus Kategori
  // ============================================================
  async function handleDeleteCategory(id: string) {
    try {
      await supabase.from('budget_transactions').delete().eq('category_id', id)
      await supabase.from('budget_categories').delete().eq('id', id)
      fetchData()
    } catch (err) {
      setError('Gagal menghapus kategori.')
      console.error(err)
    }
  }

  // ============================================================
  // Setup default categories otomatis
  // ============================================================
  async function handleSetupDefaults() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const perCategory = totalIncome > 0 ? Math.floor(totalIncome / DEFAULT_CATEGORIES.length) : 500000

      const inserts = DEFAULT_CATEGORIES.map(name => ({
        user_id: user.id,
        name,
        allocated: perCategory,
        month: thisMonth,
      }))

      const { error } = await supabase.from('budget_categories').insert(inserts)
      if (error) throw error
      fetchData()
    } catch (err) {
      setError('Gagal setup kategori default.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // Export
  // ============================================================
  function handleExportCSV() {
    exportToCSV(
      categories.map(c => ({
        kategori: c.name,
        dialokasikan: c.allocated,
        terpakai: c.spent || 0,
        sisa: c.allocated - (c.spent || 0),
        persen: c.allocated > 0 ? Math.round(((c.spent || 0) / c.allocated) * 100) : 0,
      })),
      `budget-${getThisMonthLabel()}`
    )
  }

  function handleExportJSON() {
    exportToJSON({ categories, transactions, totalIncome, bulan: getThisMonthLabel() }, `budget-${getThisMonthLabel()}`)
  }

  // ============================================================
  // Progress bar color
  // ============================================================
  function getProgressColor(spent: number, allocated: number) {
    if (allocated === 0) return 'bg-gray-600'
    const pct = (spent / allocated) * 100
    if (pct >= 100) return 'bg-red-500'
    if (pct >= 80) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  function getProgressPct(spent: number, allocated: number) {
    if (allocated === 0) return 0
    return Math.min((spent / allocated) * 100, 100)
  }

  const pieData = categories.map((c, i) => ({
    name: c.name,
    value: c.allocated,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  const catOptions = categories.map(c => ({ value: c.id, label: c.name }))

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Zero-Based Budget</h1>
          <p className="text-gray-400 text-sm mt-1">{getThisMonthLabel()} — alokasikan setiap rupiah income</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download size={14} />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download size={14} />JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setFormError(''); setTxModal(true) }}>
            <PlusCircle size={14} />Catat Pengeluaran
          </Button>
          <Button size="sm" onClick={() => { setFormError(''); setCatModal(true) }}>
            <Plus size={14} />Tambah Kategori
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Overspend Alert */}
      {overspendCategories.length > 0 && (
        <ErrorBanner
          type="error"
          title={`${overspendCategories.length} kategori overspend!`}
          message={`${overspendCategories.map(c => c.name).join(', ')} melebihi anggaran bulan ini.`}
        />
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Income Bulan Ini"
            value={formatRupiahSingkat(totalIncome)}
            subtitle="Dari Revenue Pulse"
            highlight
            icon={<Wallet size={18} />}
          />
          <StatCard
            title="Total Dialokasikan"
            value={formatRupiahSingkat(totalAllocated)}
            subtitle={`${categories.length} kategori`}
            icon={<TrendingDown size={18} />}
          />
          <StatCard
            title="Total Terpakai"
            value={formatRupiahSingkat(totalSpent)}
            subtitle={totalAllocated > 0 ? `${Math.round((totalSpent / totalAllocated) * 100)}% dari anggaran` : '—'}
            icon={<TrendingDown size={18} />}
          />
          <StatCard
            title="Belum Dialokasikan"
            value={formatRupiahSingkat(Math.max(0, unallocated))}
            subtitle={unallocated < 0 ? '⚠ Over budget!' : 'Sisa income'}
            icon={<AlertTriangle size={18} />}
          />
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Belum ada kategori budget"
            description="Mulai dengan setup 6 kategori default, atau tambah kategori sendiri"
          />
          <div className="flex justify-center gap-3 pb-6">
            <Button variant="secondary" onClick={handleSetupDefaults} isLoading={submitting}>
              Setup 6 Kategori Default
            </Button>
            <Button onClick={() => setCatModal(true)}>
              <Plus size={14} />Tambah Manual
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kategori list */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {categories.map((cat, idx) => {
              const spent = cat.spent || 0
              const pct = getProgressPct(spent, cat.allocated)
              const overSpend = spent > cat.allocated
              const nearLimit = pct >= 80 && !overSpend

              return (
                <Card key={cat.id} className={overSpend ? 'border-red-800/60' : nearLimit ? 'border-yellow-800/60' : ''}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      <span className="font-semibold text-white">{cat.name}</span>
                      {overSpend && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800">
                          Overspend
                        </span>
                      )}
                      {nearLimit && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-800">
                          Hampir Habis
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedCatId(cat.id)
                          setTxForm(f => ({ ...f, category_id: cat.id }))
                          setFormError('')
                          setTxModal(true)
                        }}
                        className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      >
                        + Catat
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(spent, cat.allocated)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      <span className={overSpend ? 'text-red-400 font-semibold' : 'text-white font-semibold'}>
                        {formatRupiah(spent)}
                      </span>
                      {' '}/ {formatRupiah(cat.allocated)}
                    </span>
                    <span className={overSpend ? 'text-red-400 font-bold' : nearLimit ? 'text-yellow-400 font-semibold' : 'text-gray-500'}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Sisa */}
                  <p className="text-xs mt-1.5 text-gray-500">
                    {overSpend
                      ? `Lebih ${formatRupiah(spent - cat.allocated)}`
                      : `Sisa ${formatRupiah(cat.allocated - spent)}`}
                  </p>
                </Card>
              )
            })}
          </div>

          {/* Pie chart sidebar */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Alokasi Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {categories.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="text-gray-400">{c.name}</span>
                      </div>
                      <span className="text-gray-300 font-medium">
                        {totalAllocated > 0 ? Math.round((c.allocated / totalAllocated) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Income</span>
                    <span className="text-white font-semibold">{formatRupiah(totalIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dialokasikan</span>
                    <span className="text-white font-semibold">{formatRupiah(totalAllocated)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Terpakai</span>
                    <span className="text-white font-semibold">{formatRupiah(totalSpent)}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-3 flex justify-between">
                    <span className="text-gray-400">Sisa (Tabungan)</span>
                    <span className={`font-bold ${totalIncome - totalSpent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatRupiah(totalIncome - totalSpent)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Tambah Kategori */}
      <Modal isOpen={catModal} onClose={() => { setCatModal(false); setFormError('') }} title="Tambah Kategori Budget">
        <form onSubmit={handleAddCategory} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <Select
            id="cat-name"
            label="Nama Kategori"
            value={catForm.name}
            onChange={e => setCatForm({ ...catForm, name: e.target.value })}
            options={[
              ...DEFAULT_CATEGORIES.map(n => ({ value: n, label: n })),
              { value: '__custom', label: 'Lainnya (isi sendiri)' },
            ]}
          />
          {catForm.name === '__custom' && (
            <Input
              id="cat-custom"
              label="Nama Kategori Custom"
              placeholder="Misal: Transport, Kesehatan..."
              value={catForm.customName}
              onChange={e => setCatForm({ ...catForm, customName: e.target.value })}
            />
          )}
          <Input
            id="cat-allocated"
            label="Anggaran (Rp)"
            placeholder="2000000"
            type="number"
            min="1"
            value={catForm.allocated}
            onChange={e => setCatForm({ ...catForm, allocated: e.target.value })}
            hint={totalIncome > 0 ? `Total income bulan ini: ${formatRupiah(totalIncome)}` : undefined}
          />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setCatModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>Simpan</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Catat Pengeluaran */}
      <Modal isOpen={txModal} onClose={() => { setTxModal(false); setFormError('') }} title="Catat Pengeluaran">
        <form onSubmit={handleAddTransaction} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <Select
            id="tx-category"
            label="Kategori"
            value={txForm.category_id}
            onChange={e => setTxForm({ ...txForm, category_id: e.target.value })}
            options={[{ value: '', label: '— Pilih Kategori —' }, ...catOptions]}
          />
          <Input
            id="tx-amount"
            label="Jumlah (Rp)"
            placeholder="150000"
            type="number"
            min="1"
            value={txForm.amount}
            onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
          />
          <Input
            id="tx-desc"
            label="Keterangan (opsional)"
            placeholder="Misal: Makan siang, bayar listrik..."
            value={txForm.description}
            onChange={e => setTxForm({ ...txForm, description: e.target.value })}
          />
          <Input
            id="tx-date"
            label="Tanggal"
            type="date"
            value={txForm.date}
            onChange={e => setTxForm({ ...txForm, date: e.target.value })}
          />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setTxModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>Simpan</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
