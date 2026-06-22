'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { v2Api } from '@/lib/v2-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Sparkles, Download, Copy, FileText, Plus, Trash2, Clock } from 'lucide-react'
import { formatTanggalIndonesia } from '@/lib/export'

const PROJECT_TYPES = [
  { value: 'Web Development', label: 'Web Development' },
  { value: 'Mobile App', label: 'Mobile App' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Security Audit', label: 'Security Audit' },
  { value: 'Bug Bounty Report', label: 'Bug Bounty Report' },
  { value: 'Konsultasi IT', label: 'Konsultasi IT' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Lainnya', label: 'Lainnya' },
]

interface Proposal {
  [key: string]: unknown
  id: string
  client_name: string
  project_type: string | null
  content: string | null
  created_at: string
}

export default function ProposalPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedHTML, setGeneratedHTML] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [previewModal, setPreviewModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saveAfterGenerate, setSaveAfterGenerate] = useState(false)
  const [savingProposal, setSavingProposal] = useState(false)

  const [form, setForm] = useState({
    client_name: '',
    project_type: 'Web Development',
    budget_range: '',
    timeline: '',
    deliverables: '',
    company_name: '',
    language: 'id',
    model: 'gemini-3.1-flash-lite',
  })

  const LANGUAGE_OPTIONS = [
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'en', label: 'English' },
  ]

  const AI_MODELS = [
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Cepat)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Pintar)' },
  ]

  const supabase = createClient()

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const data = await v2Api.list<Proposal>('proposals', { order: 'created_at', asc: 'false' })
      setProposals(data)
    } catch (err) {
      setError('Gagal memuat proposals.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_name.trim()) { setError('Nama klien wajib diisi'); return }

    setError('')
    setGenerating(true)
    setGeneratedHTML('')

    try {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal generate proposal')
      setGeneratedHTML(data.html)
      setSaveAfterGenerate(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveProposal() {
    if (!generatedHTML) return
    setSavingProposal(true)
    try {
      await v2Api.create('proposals', {
        client_name: form.client_name,
        project_type: form.project_type,
        budget_range: form.budget_range || null,
        duration: form.timeline || null,
        content: generatedHTML,
      })
      setSaveAfterGenerate(false)
      fetchProposals()
    } catch (err) {
      setError('Gagal menyimpan proposal.')
      console.error(err)
    } finally {
      setSavingProposal(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await v2Api.remove('proposals', id)
      setProposals(prev => prev.filter(p => p.id !== id))
      setDeleteId(null)
    } catch { setError('Gagal menghapus proposal.') }
  }

  function handleCopy(html: string) {
    // Convert HTML to plain text for clipboard
    const div = document.createElement('div')
    div.innerHTML = html
    navigator.clipboard.writeText(div.innerText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint(html: string) {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proposal</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #111; }
            h1,h2,h3 { color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Proposal Generator</h1>
          <p className="text-gray-400 text-sm mt-1">Generate proposal profesional dengan AI dalam hitungan detik</p>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" />
              Detail Proposal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Input
                id="prop-client"
                label="Nama Klien / Perusahaan"
                placeholder="PT Maju Bersama / Budi Santoso"
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })}
                required
              />
              <Select
                id="prop-type"
                label="Jenis Project"
                value={form.project_type}
                onChange={e => setForm({ ...form, project_type: e.target.value })}
                options={PROJECT_TYPES}
              />
              <Input
                id="prop-budget"
                label="Budget Range (opsional)"
                placeholder="Rp 15.000.000 – Rp 25.000.000"
                value={form.budget_range}
                onChange={e => setForm({ ...form, budget_range: e.target.value })}
              />
              <Input
                id="prop-timeline"
                label="Timeline (opsional)"
                placeholder="3 minggu / 1 bulan"
                value={form.timeline}
                onChange={e => setForm({ ...form, timeline: e.target.value })}
              />
              <Textarea
                id="prop-deliverables"
                label="Deliverables (opsional)"
                placeholder="Landing page + CMS + dokumentasi + training..."
                value={form.deliverables}
                onChange={e => setForm({ ...form, deliverables: e.target.value })}
                rows={3}
              />
              <Input
                id="prop-company"
                label="Nama Kamu / Studio"
                placeholder="Dev by Rizal / Studio Digital"
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
              />
              <Select
                id="prop-language"
                label="Bahasa Proposal"
                value={form.language}
                onChange={e => setForm({ ...form, language: e.target.value })}
                options={LANGUAGE_OPTIONS}
              />
              <Select
                id="prop-model"
                label="Model AI"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                options={AI_MODELS}
              />
              <Button type="submit" className="w-full" isLoading={generating}>
                <Sparkles size={16} />
                {generating ? 'Sedang generate...' : 'Generate Proposal'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {generating && (
            <Card className="border-yellow-800/40">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 text-yellow-400">
                    <Sparkles size={24} className="animate-pulse" />
                    <span className="text-lg font-semibold">AI sedang menulis proposal...</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">Biasanya membutuhkan 10–30 detik</p>
                </div>
              </CardContent>
            </Card>
          )}

          {generatedHTML && !generating && (
            <Card className="border-emerald-800/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                  <Sparkles size={16} />Proposal Siap!
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => handleCopy(generatedHTML)}>
                    <Copy size={14} />{copied ? 'Tersalin!' : 'Copy Teks'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(generatedHTML)}>
                    <Download size={14} />Print / PDF
                  </Button>
                  {saveAfterGenerate && (
                    <Button size="sm" onClick={handleSaveProposal} isLoading={savingProposal}>
                      <Plus size={14} />Simpan ke Library
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-invert prose-sm max-w-none bg-gray-900 rounded-lg p-6 border border-gray-800 max-h-[60vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: generatedHTML }}
                />
              </CardContent>
            </Card>
          )}

          {!generating && !generatedHTML && (
            <Card>
              <EmptyState
                icon={FileText}
                title="Siap generate proposal"
                description="Isi form di sebelah kiri dan klik Generate. AI akan menulis proposal profesional untuk klien Anda."
              />
            </Card>
          )}
        </div>
      </div>

      {/* Saved Proposals */}
      <Card>
        <CardHeader>
          <CardTitle>Library Proposal Tersimpan</CardTitle>
          <span className="text-sm text-gray-500">{proposals.length} proposal</span>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonTable rows={3} /> : proposals.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Belum ada proposal tersimpan.</p>
          ) : (
            <div className="space-y-2">
              {proposals.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gray-500 shrink-0" />
                    <div>
                      <p className="text-white font-medium">{p.client_name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{p.project_type}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{formatTanggalIndonesia(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedProposal(p); setPreviewModal(true) }}>Preview</Button>
                    {p.content && (
                      <Button size="sm" variant="outline" onClick={() => handleCopy(p.content!)}>
                        <Copy size={12} />
                      </Button>
                    )}
                    <button onClick={() => setDeleteId(p.id)} className="p-2 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Modal isOpen={previewModal} onClose={() => { setPreviewModal(false); setSelectedProposal(null) }} title={selectedProposal ? `Proposal — ${selectedProposal.client_name}` : 'Preview'} size="xl">
        {selectedProposal?.content && (
          <>
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant="secondary" onClick={() => handleCopy(selectedProposal.content!)}>
                <Copy size={14} />Copy Teks
              </Button>
              <Button size="sm" variant="outline" onClick={() => handlePrint(selectedProposal.content!)}>
                <Download size={14} />Print / PDF
              </Button>
            </div>
            <div
              className="prose prose-invert prose-sm max-w-none bg-gray-900 rounded-lg p-6 border border-gray-800 max-h-[70vh] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: selectedProposal.content }}
            />
          </>
        )}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setPreviewModal(false)}>Tutup</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Proposal" size="sm">
        <p className="text-gray-300 text-sm">Yakin ingin menghapus proposal ini dari library?</p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Hapus</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
