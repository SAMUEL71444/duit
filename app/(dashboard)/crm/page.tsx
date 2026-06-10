'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Badge, StageBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { exportToCSV, exportToJSON, formatRupiah, formatRupiahSingkat, formatTanggalIndonesia } from '@/lib/export'
import { isMoreThanDaysAgo } from '@/lib/utils'
import { Plus, Download, Edit2, Trash2, Users, TrendingUp, Clock, AlertCircle, GripVertical, Phone } from 'lucide-react'

const STAGES = ['Lead', 'Negosiasi', 'Aktif', 'Selesai', 'Tidak Jadi'] as const
type Stage = typeof STAGES[number]

const STAGE_COLORS: Record<Stage, string> = {
  Lead: 'border-blue-800/60 bg-blue-950/20',
  Negosiasi: 'border-yellow-800/60 bg-yellow-950/20',
  Aktif: 'border-emerald-800/60 bg-emerald-950/20',
  Selesai: 'border-gray-700/60 bg-gray-800/20',
  'Tidak Jadi': 'border-red-800/60 bg-red-950/20',
}

const PROJECT_TYPES = [
  { value: 'Web Development', label: 'Web Development' },
  { value: 'Mobile App', label: 'Mobile App' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Bug Bounty', label: 'Bug Bounty' },
  { value: 'Security Audit', label: 'Security Audit' },
  { value: 'Konsultasi', label: 'Konsultasi' },
  { value: 'Lainnya', label: 'Lainnya' },
]

interface Deal {
  id: string
  client_name: string
  value: number | null
  project_type: string | null
  stage: Stage
  deadline: string | null
  last_contact: string | null
  probability: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

const emptyDeal: Omit<Deal, 'id' | 'created_at' | 'updated_at'> = {
  client_name: '',
  value: null,
  project_type: 'Web Development',
  stage: 'Lead',
  deadline: '',
  last_contact: new Date().toISOString().split('T')[0],
  probability: 50,
  notes: '',
}

// ============================================================
// Sortable Deal Card
// ============================================================
function DealCard({
  deal,
  onEdit,
  onDelete,
}: {
  deal: Deal
  onEdit: (deal: Deal) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isStale = isMoreThanDaysAgo(deal.updated_at, 3)
  const isDeadlineSoon = deal.deadline && isMoreThanDaysAgo(deal.deadline, -3) && !isMoreThanDaysAgo(deal.deadline, 0)
  const isOverdue = deal.deadline && isMoreThanDaysAgo(deal.deadline, 0) && deal.stage !== 'Selesai' && deal.stage !== 'Tidak Jadi'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-default group hover:border-gray-700 transition-colors"
    >
      {/* Drag handle + header */}
      <div className="flex items-start gap-2 mb-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">{deal.client_name}</span>
            {isStale && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800 shrink-0">
                <AlertCircle size={10} />
                Lama
              </span>
            )}
          </div>
          {deal.project_type && (
            <p className="text-xs text-gray-500 mt-0.5">{deal.project_type}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(deal)} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors">
            <Edit2 size={12} />
          </button>
          <button onClick={() => onDelete(deal.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Value + probability */}
      {deal.value && (
        <p className="text-sm font-bold text-emerald-400 mb-2">{formatRupiah(deal.value)}</p>
      )}

      {/* Info baris */}
      <div className="space-y-1.5 text-xs text-gray-500">
        {deal.deadline && (
          <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : isDeadlineSoon ? 'text-yellow-400' : ''}`}>
            <Clock size={11} className="shrink-0" />
            <span>Deadline: {formatTanggalIndonesia(deal.deadline)}</span>
            {isOverdue && <span className="text-red-400">(Lewat!)</span>}
          </div>
        )}
        {deal.last_contact && (
          <div className="flex items-center gap-1.5">
            <Phone size={11} className="shrink-0" />
            <span>Kontak: {formatTanggalIndonesia(deal.last_contact)}</span>
          </div>
        )}
        {deal.probability !== null && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-emerald-500"
                style={{ width: `${deal.probability}%` }}
              />
            </div>
            <span className="text-gray-400 font-medium">{deal.probability}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Kanban Column
// ============================================================
function KanbanColumn({
  stage,
  deals,
  onEdit,
  onDelete,
}: {
  stage: Stage
  deals: Deal[]
  onEdit: (deal: Deal) => void
  onDelete: (id: string) => void
}) {
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <div className={`flex flex-col rounded-xl border p-3 min-w-[240px] ${STAGE_COLORS[stage]}`}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <StageBadge stage={stage} />
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500">{deals.length} deal</span>
          {totalValue > 0 && (
            <p className="text-xs font-semibold text-gray-300">{formatRupiahSingkat(totalValue)}</p>
          )}
        </div>
      </div>

      {/* Deals */}
      <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
          {deals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg py-8">
              <p className="text-xs text-gray-600">Drop di sini</p>
            </div>
          ) : (
            deals.map(deal => (
              <DealCard key={deal.id} deal={deal} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ============================================================
// Main CRM Page
// ============================================================
export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [form, setForm] = useState(emptyDeal)

  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('crm_deals')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (err) {
      setError('Gagal memuat data CRM.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  // ============================================================
  // Drag & Drop
  // ============================================================
  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find(d => d.id === event.active.id)
    setActiveDeal(deal || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDeal(null)

    if (!over || active.id === over.id) return

    const activeDealItem = deals.find(d => d.id === active.id)
    const overDealItem = deals.find(d => d.id === over.id)

    if (!activeDealItem) return

    // Kalau drop ke deal lain yang berbeda stage → pindah stage
    if (overDealItem && activeDealItem.stage !== overDealItem.stage) {
      const newStage = overDealItem.stage
      setDeals(prev => prev.map(d => d.id === activeDealItem.id ? { ...d, stage: newStage } : d))

      try {
        await supabase
          .from('crm_deals')
          .update({ stage: newStage, updated_at: new Date().toISOString() })
          .eq('id', activeDealItem.id)
      } catch (err) {
        console.error(err)
        fetchDeals()
      }
      return
    }

    // Sama stage → reorder
    if (overDealItem && activeDealItem.stage === overDealItem.stage) {
      const stageDeals = deals.filter(d => d.stage === activeDealItem.stage)
      const oldIdx = stageDeals.findIndex(d => d.id === active.id)
      const newIdx = stageDeals.findIndex(d => d.id === over.id)
      const reordered = arrayMove(stageDeals, oldIdx, newIdx)

      setDeals(prev => {
        const otherDeals = prev.filter(d => d.stage !== activeDealItem.stage)
        return [...otherDeals, ...reordered]
      })
    }
  }

  // ============================================================
  // CRUD
  // ============================================================
  function openAdd() {
    setEditingDeal(null)
    setForm({ ...emptyDeal, last_contact: new Date().toISOString().split('T')[0] })
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(deal: Deal) {
    setEditingDeal(deal)
    setForm({
      client_name: deal.client_name,
      value: deal.value,
      project_type: deal.project_type || 'Web Development',
      stage: deal.stage,
      deadline: deal.deadline || '',
      last_contact: deal.last_contact || new Date().toISOString().split('T')[0],
      probability: deal.probability ?? 50,
      notes: deal.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!form.client_name.trim()) {
      setFormError('Nama klien wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        client_name: form.client_name.trim(),
        value: form.value || null,
        project_type: form.project_type || null,
        stage: form.stage,
        deadline: form.deadline || null,
        last_contact: form.last_contact || null,
        probability: form.probability ?? null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      }

      if (editingDeal) {
        const { error } = await supabase.from('crm_deals').update(payload).eq('id', editingDeal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('crm_deals').insert({ ...payload, user_id: user.id })
        if (error) throw error
      }

      setModalOpen(false)
      fetchDeals()
    } catch (err) {
      setFormError('Gagal menyimpan deal.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from('crm_deals').delete().eq('id', id)
      setDeals(prev => prev.filter(d => d.id !== id))
      setDeletingId(null)
    } catch (err) {
      setError('Gagal menghapus deal.')
      console.error(err)
    }
  }

  // ============================================================
  // Statistik client-side
  // ============================================================
  const activeDeals = deals.filter(d => d.stage === 'Aktif')
  const closedWon = deals.filter(d => d.stage === 'Selesai')
  const closedLost = deals.filter(d => d.stage === 'Tidak Jadi')
  const closingRate = (closedWon.length + closedLost.length) > 0
    ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100)
    : 0
  const pipelineValue = deals
    .filter(d => d.stage !== 'Selesai' && d.stage !== 'Tidak Jadi')
    .reduce((sum, d) => sum + ((d.value || 0) * ((d.probability || 100) / 100)), 0)
  const followUpToday = deals.filter(d =>
    d.stage !== 'Selesai' && d.stage !== 'Tidak Jadi' && isMoreThanDaysAgo(d.last_contact, 2)
  )

  // ============================================================
  // Export
  // ============================================================
  function handleExportCSV() {
    exportToCSV(deals.map(d => ({
      klien: d.client_name,
      nilai: d.value || 0,
      jenis_project: d.project_type || '',
      stage: d.stage,
      probability: d.probability || 0,
      deadline: d.deadline || '',
      last_contact: d.last_contact || '',
      catatan: d.notes || '',
    })), 'crm-deals')
  }

  function handleExportJSON() {
    exportToJSON(deals, 'crm-deals')
  }

  const dealsByStage = (stage: Stage) => deals.filter(d => d.stage === stage)

  const stageOptions = STAGES.map(s => ({ value: s, label: s }))
  const projectTypeOptions = PROJECT_TYPES

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Freelance CRM</h1>
          <p className="text-gray-400 text-sm mt-1">Kelola pipeline project freelance kamu</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download size={14} />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download size={14} />JSON
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus size={14} />Tambah Deal
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Follow-up alert */}
      {followUpToday.length > 0 && (
        <ErrorBanner
          type="warning"
          title={`${followUpToday.length} deal perlu follow-up hari ini`}
          message={`${followUpToday.map(d => d.client_name).join(', ')} belum dikontak lebih dari 2 hari.`}
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
            title="Pipeline Value"
            value={formatRupiahSingkat(pipelineValue)}
            subtitle="Weighted by probability"
            highlight
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            title="Deal Aktif"
            value={String(activeDeals.length)}
            subtitle={`${deals.filter(d => d.stage !== 'Selesai' && d.stage !== 'Tidak Jadi').length} total terbuka`}
            icon={<Users size={18} />}
          />
          <StatCard
            title="Closing Rate"
            value={`${closingRate}%`}
            subtitle={`${closedWon.length} selesai, ${closedLost.length} tidak jadi`}
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            title="Follow-up Hari Ini"
            value={String(followUpToday.length)}
            subtitle="Deal belum dikontak >2 hari"
            icon={<Clock size={18} />}
          />
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(s => <div key={s} className="min-w-[240px]"><SkeletonCard /></div>)}
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-16">
          <EmptyState
            icon={Users}
            title="Belum ada deal"
            description="Tambah deal pertama untuk mulai track pipeline freelance kamu"
            actionLabel="Tambah Deal"
            onAction={openAdd}
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={dealsByStage(stage)}
                onEdit={openEdit}
                onDelete={(id) => setDeletingId(id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 opacity-90 shadow-2xl rotate-1 cursor-grabbing min-w-[240px]">
                <p className="font-semibold text-white text-sm">{activeDeal.client_name}</p>
                {activeDeal.value && <p className="text-emerald-400 text-sm font-bold">{formatRupiah(activeDeal.value)}</p>}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal Add/Edit Deal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFormError('') }}
        title={editingDeal ? `Edit — ${editingDeal.client_name}` : 'Tambah Deal Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorBanner type="error" message={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="deal-client"
              label="Nama Klien"
              placeholder="PT Maju Bersama / Budi Santoso"
              value={form.client_name}
              onChange={e => setForm({ ...form, client_name: e.target.value })}
              required
            />
            <Input
              id="deal-value"
              label="Nilai Project (Rp)"
              placeholder="15000000"
              type="number"
              min="0"
              value={form.value?.toString() || ''}
              onChange={e => setForm({ ...form, value: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="deal-type"
              label="Jenis Project"
              value={form.project_type || ''}
              onChange={e => setForm({ ...form, project_type: e.target.value })}
              options={projectTypeOptions}
            />
            <Select
              id="deal-stage"
              label="Stage"
              value={form.stage}
              onChange={e => setForm({ ...form, stage: e.target.value as Stage })}
              options={stageOptions}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="deal-deadline"
              label="Deadline"
              type="date"
              value={form.deadline || ''}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
            />
            <Input
              id="deal-last-contact"
              label="Terakhir Kontak"
              type="date"
              value={form.last_contact || ''}
              onChange={e => setForm({ ...form, last_contact: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1.5">
              Probability Closing: <span className="text-emerald-400 font-bold">{form.probability}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.probability || 0}
              onChange={e => setForm({ ...form, probability: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <Textarea
            id="deal-notes"
            label="Catatan"
            placeholder="Detail project, requirement, atau hal penting lainnya..."
            value={form.notes || ''}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" isLoading={submitting}>
              {editingDeal ? 'Update Deal' : 'Tambah Deal'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Hapus Deal" size="sm">
        <p className="text-gray-300 text-sm">
          Yakin ingin menghapus deal ini? Data yang dihapus tidak bisa dikembalikan.
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeletingId(null)}>Batal</Button>
          <Button variant="danger" onClick={() => deletingId && handleDelete(deletingId)}>
            Ya, Hapus
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
