'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { exportToCSV, exportToJSON, formatTanggalIndonesia } from '@/lib/export'
import { Plus, Download, Copy, Trash2, Edit2, Search, Sparkles, BookOpen, Tag, Clock } from 'lucide-react'

interface Prompt {
  [key: string]: unknown
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  use_count: number
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { value: 'coding', label: '💻 Coding' },
  { value: 'security', label: '🔐 Security' },
  { value: 'marketing', label: '📣 Marketing' },
  { value: 'writing', label: '✍️ Writing' },
  { value: 'finance', label: '💰 Finance' },
  { value: 'productivity', label: '⚡ Productivity' },
  { value: 'research', label: '🔍 Research' },
  { value: 'lainnya', label: '📦 Lainnya' },
]

const CATEGORY_ICONS: Record<string, string> = {
  coding: '💻', security: '🔐', marketing: '📣', writing: '✍️',
  finance: '💰', productivity: '⚡', research: '🔍', lainnya: '📦',
}

const DEFAULT_PROMPTS: Omit<Prompt, 'id' | 'use_count' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Code Review Expert',
    content: 'Kamu adalah senior software engineer dengan 15 tahun pengalaman. Review kode berikut dengan fokus pada: keamanan, performa, maintainability, dan best practices. Berikan feedback spesifik dengan contoh perbaikan:\n\n[paste kode di sini]',
    category: 'coding',
    tags: ['code-review', 'senior-dev'],
  },
  {
    title: 'Proposal Freelance Profesional',
    content: 'Tulis proposal freelance profesional dalam bahasa Indonesia yang meyakinkan untuk klien [nama klien] tentang project [jenis project]. Budget: [range budget]. Timeline: [durasi]. Sertakan: executive summary, pendekatan kerja, timeline detail, harga, dan call-to-action.',
    category: 'marketing',
    tags: ['proposal', 'freelance'],
  },
  {
    title: 'Penjelasan Teknis ke Non-Teknis',
    content: 'Jelaskan konsep teknis berikut kepada seseorang yang tidak memiliki background IT. Gunakan analogi sehari-hari, hindari jargon, dan buat penjelasan semenarik mungkin:\n\nKonsep: [isi di sini]',
    category: 'writing',
    tags: ['teknis', 'komunikasi'],
  },
  {
    title: 'Security Audit Checklist',
    content: 'Kamu adalah security researcher berpengalaman. Buat checklist audit keamanan komprehensif untuk [jenis aplikasi: web app / API / mobile app]. Kelompokkan berdasarkan: Authentication, Authorization, Input Validation, Data Protection, Infrastructure, dan Monitoring.',
    category: 'security',
    tags: ['audit', 'checklist'],
  },
]

export default function PromptVaultPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [previewPrompt, setPreviewPrompt] = useState<Prompt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const [form, setForm] = useState({ title: '', content: '', category: 'coding', tags: '' })

  const supabase = createClient()

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const data = await v2Api.list<Prompt>('prompts', { order: 'use_count', asc: 'false' })
      setPrompts(data)
    } catch { setError('Gagal memuat prompts.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPrompts() }, [fetchPrompts])

  // Seed default prompts
  async function handleSeedDefaults() {
    setSeeding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      for (const p of DEFAULT_PROMPTS) {
        await v2Api.create('prompts', { ...p, use_count: 0 })
      }
      fetchPrompts()
    } catch { setError('Gagal menambah default prompts.') }
    finally { setSeeding(false) }
  }

  // ============================================================
  // CRUD
  // ============================================================
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) { setFormError('Judul wajib diisi'); return }
    if (!form.content.trim()) { setFormError('Konten prompt wajib diisi'); return }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const payload = { title: form.title, content: form.content, category: form.category, tags }

      if (editingPrompt) {
        await v2Api.update('prompts', editingPrompt.id, { ...payload, updated_at: new Date().toISOString() })
      } else {
        await v2Api.create('prompts', { ...payload, use_count: 0 })
      }

      setAddModal(false)
      setEditingPrompt(null)
      setForm({ title: '', content: '', category: 'coding', tags: '' })
      fetchPrompts()
    } catch { setFormError('Gagal menyimpan prompt.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    try {
      await v2Api.remove('prompts', id)
      setPrompts(prev => prev.filter(p => p.id !== id))
      setDeleteId(null)
      if (previewPrompt?.id === id) setPreviewPrompt(null)
    } catch { setError('Gagal menghapus prompt.') }
  }

  async function handleCopy(prompt: Prompt) {
    await navigator.clipboard.writeText(prompt.content)
    setCopied(prompt.id)
    setTimeout(() => setCopied(null), 2000)
    // Increment use count
    await v2Api.update('prompts', prompt.id, { use_count: prompt.use_count + 1 })
    setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, use_count: p.use_count + 1 } : p))
  }

  // ============================================================
  // Filter
  // ============================================================
  const filtered = prompts.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchCat = !filterCategory || p.category === filterCategory
    return matchSearch && matchCat
  })

  const totalUsed = prompts.reduce((sum, p) => sum + p.use_count, 0)
  const topCategory = prompts.length > 0
    ? Object.entries(prompts.reduce<Record<string, number>>((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {}))
        .sort(([, a], [, b]) => b - a)[0]?.[0] || ''
    : ''

  function handleExportCSV() {
    exportToCSV(prompts.map(p => ({ title: p.title, category: p.category, tags: p.tags.join(';'), use_count: p.use_count, content: p.content.replace(/\n/g, ' ') })), 'prompt-vault')
  }

  const categoryOptions = [{ value: '', label: 'Semua Kategori' }, ...CATEGORIES]

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Prompt Vault</h1>
          <p className="text-gray-400 text-sm mt-1">Library system prompts AI — simpan, kelola, dan copy dengan 1 klik</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download size={14} />CSV</Button>
          {prompts.length === 0 && (
            <Button variant="secondary" size="sm" onClick={handleSeedDefaults} isLoading={seeding}>
              <Sparkles size={14} />Tambah 4 Default Prompts
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditingPrompt(null); setForm({ title: '', content: '', category: 'coding', tags: '' }); setFormError(''); setAddModal(true) }}>
            <Plus size={14} />Tambah Prompt
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Prompts" value={String(prompts.length)} subtitle="tersimpan" highlight icon={<BookOpen size={18} />} />
        <StatCard title="Total Digunakan" value={String(totalUsed)} subtitle="kali copy" icon={<Copy size={18} />} />
        <StatCard title="Kategori Terbanyak" value={CATEGORY_ICONS[topCategory] || '—'} subtitle={topCategory || 'belum ada'} icon={<Tag size={18} />} />
        <StatCard title="Kategori" value={String(new Set(prompts.map(p => p.category)).size)} subtitle="berbeda" icon={<Tag size={18} />} />
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Cari judul, konten, atau tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Category pills */}
      {!filterCategory && !search && (
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.filter(c => prompts.some(p => p.category === c.value)).map(c => {
            const count = prompts.filter(p => p.category === c.value).length
            return (
              <button key={c.value} onClick={() => setFilterCategory(c.value)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:border-emerald-600 hover:text-emerald-400 transition-colors">
                {c.label} <span className="text-xs text-gray-500">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Prompts Grid */}
      {loading ? <SkeletonTable rows={4} /> : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title={search || filterCategory ? 'Tidak ada prompt yang cocok' : 'Prompt Vault kosong'} description={search || filterCategory ? 'Coba kata kunci lain atau reset filter' : 'Tambah prompt pertama atau import 4 default prompts'} actionLabel={prompts.length === 0 ? 'Tambah 4 Default Prompts' : 'Tambah Prompt'} onAction={prompts.length === 0 ? handleSeedDefaults : () => setAddModal(true)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card
              key={p.id}
              className="group hover:border-gray-600 transition-all cursor-pointer"
              onClick={() => setPreviewPrompt(p)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[p.category] || '📦'}</span>
                    <p className="font-semibold text-white text-sm leading-snug">{p.title}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleCopy(p)} className="p-1.5 rounded text-gray-500 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors">
                      {copied === p.id ? <span className="text-xs text-emerald-400">✓</span> : <Copy size={13} />}
                    </button>
                    <button onClick={() => { setEditingPrompt(p); setForm({ title: p.title, content: p.content, category: p.category, tags: p.tags.join(', ') }); setFormError(''); setAddModal(true) }} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed">{p.content}</p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {p.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{tag}</span>
                  ))}
                  {p.use_count > 0 && (
                    <span className="text-xs text-gray-600 ml-auto flex items-center gap-1"><Clock size={10} />{p.use_count}×</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal isOpen={!!previewPrompt} onClose={() => setPreviewPrompt(null)} title={previewPrompt?.title || ''} size="xl">
        {previewPrompt && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{CATEGORY_ICONS[previewPrompt.category]} {previewPrompt.category}</span>
              {previewPrompt.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">{t}</span>)}
              <span className="text-xs text-gray-600 ml-auto">{previewPrompt.use_count}× digunakan</span>
            </div>
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
              {previewPrompt.content}
            </div>
          </>
        )}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setPreviewPrompt(null)}>Tutup</Button>
          {previewPrompt && (
            <Button onClick={() => handleCopy(previewPrompt)}>
              <Copy size={14} />{copied === previewPrompt.id ? 'Tersalin!' : 'Copy Prompt'}
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setEditingPrompt(null) }} title={editingPrompt ? `Edit — ${editingPrompt.title}` : 'Tambah Prompt Baru'} size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input id="pv-title" label="Judul Prompt" placeholder="Code Review Expert" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <Select id="pv-cat" label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
          </div>
          <Textarea
            id="pv-content"
            label="Konten Prompt"
            placeholder="Tulis system prompt di sini. Gunakan [placeholder] untuk bagian yang perlu diisi..."
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            rows={8}
            required
          />
          <Input id="pv-tags" label="Tags (pisah dengan koma)" placeholder="code-review, security, senior-dev" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setAddModal(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>{editingPrompt ? 'Update' : 'Simpan'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Prompt" size="sm">
        <p className="text-gray-300 text-sm">Yakin ingin menghapus prompt ini dari vault?</p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
