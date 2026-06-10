'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { v2Api } from '@/lib/v2-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { ErrorBanner } from '@/components/ui/error-banner'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatTanggalIndonesia } from '@/lib/export'
import { Sparkles, ChevronDown, ChevronRight, Calendar, Clock, Trash2 } from 'lucide-react'

interface WeeklyReview {
  id: string
  week_start: string
  achievements: string | null
  challenges: string | null
  next_week_goals: string | null
  mood_score: number | null
  ai_summary: string | null
  created_at: string
}

const MOODS = [
  { score: 1, emoji: '😞', label: 'Sangat Buruk' },
  { score: 2, emoji: '😕', label: 'Buruk' },
  { score: 3, emoji: '😐', label: 'Biasa' },
  { score: 4, emoji: '🙂', label: 'Baik' },
  { score: 5, emoji: '😄', label: 'Sangat Baik' },
]

function getMondayOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export default function WeeklyReviewPage() {
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const thisMonday = getMondayOfWeek(new Date())

  const [form, setForm] = useState({
    week_start: thisMonday,
    achievements: '',
    challenges: '',
    next_week_goals: '',
    mood_score: 3,
    model: 'gemini-3.1-flash-lite',
  })
  const [aiSummary, setAiSummary] = useState('')

  const AI_MODELS = [
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Cepat)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Pintar)' },
  ]
  const [summaryGenerated, setSummaryGenerated] = useState(false)

  const supabase = createClient()

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const data = await v2Api.list<WeeklyReview>('weekly_reviews', { order: 'week_start', asc: 'false' })
      setReviews(data)
    } catch { setError('Gagal memuat weekly reviews.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  async function handleGenerate() {
    if (!form.achievements.trim() && !form.challenges.trim()) {
      setError('Isi pencapaian atau tantangan minggu ini dulu'); return
    }
    setError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: form.week_start,
          achievements: form.achievements,
          challenges: form.challenges,
          next_week_goals: form.next_week_goals,
          mood_score: form.mood_score,
          model: form.model,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal generate')
      setAiSummary(data.summary)
      setSummaryGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const existing = (await v2Api.list<{ id: string; week_start: string }>('weekly_reviews'))
        .find(r => r.week_start === form.week_start)

      const payload = {
        achievements: form.achievements || null,
        challenges: form.challenges || null,
        next_week_goals: form.next_week_goals || null,
        mood_score: form.mood_score,
        ai_summary: aiSummary || null,
      }

      if (existing) {
        await v2Api.update('weekly_reviews', existing.id, payload)
      } else {
        await v2Api.create('weekly_reviews', { ...payload, week_start: form.week_start })
      }

      // Reset form
      setForm({ week_start: thisMonday, achievements: '', challenges: '', next_week_goals: '', mood_score: 3 })
      setAiSummary('')
      setSummaryGenerated(false)
      fetchReviews()
    } catch { setError('Gagal menyimpan review.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await v2Api.remove('weekly_reviews', id)
      setReviews(prev => prev.filter(r => r.id !== id))
    } catch { setError('Gagal menghapus review.') }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const moodObj = MOODS.find(m => m.score === form.mood_score) || MOODS[2]

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Review</h1>
        <p className="text-gray-400 text-sm mt-1">Refleksi mingguan bertenaga AI — evaluasi, pembelajaran, dan rencana ke depan</p>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Form minggu ini */}
      <Card className="border-emerald-800/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar size={18} />Review Minggu Ini</CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={form.week_start}
              onChange={e => setForm({ ...form, week_start: e.target.value })}
              className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-gray-500">Senin awal minggu</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mood */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Mood minggu ini: <span className="text-2xl ml-1">{moodObj.emoji}</span> <span className="text-gray-400 text-sm">{moodObj.label}</span></label>
            <div className="flex gap-3">
              {MOODS.map(m => (
                <button
                  key={m.score}
                  onClick={() => setForm({ ...form, mood_score: m.score })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${form.mood_score === m.score ? 'border-emerald-600 bg-emerald-950/40' : 'border-gray-800 hover:border-gray-600'}`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-xs text-gray-500">{m.score}</span>
                </button>
              ))}
            </div>
          </div>

          <Textarea
            id="wr-achievements"
            label="✅ Pencapaian minggu ini"
            placeholder="Apa yang berhasil diselesaikan? Deal ditutup? Feature di-launch? Klien puas?..."
            value={form.achievements}
            onChange={e => setForm({ ...form, achievements: e.target.value })}
            rows={3}
          />
          <Textarea
            id="wr-challenges"
            label="🚧 Tantangan & hambatan"
            placeholder="Apa yang berjalan tidak sesuai rencana? Blocker apa yang ada?..."
            value={form.challenges}
            onChange={e => setForm({ ...form, challenges: e.target.value })}
            rows={3}
          />
          <Textarea
            id="wr-goals"
            label="🎯 Goals minggu depan"
            placeholder="3 hal terpenting yang harus diselesaikan minggu depan..."
            value={form.next_week_goals}
            onChange={e => setForm({ ...form, next_week_goals: e.target.value })}
            rows={3}
          />

          <div className="flex gap-3">
            <Button onClick={handleGenerate} isLoading={generating} variant="secondary">
              <Sparkles size={16} />{generating ? 'AI sedang menulis...' : 'Generate Ringkasan AI'}
            </Button>
            {(aiSummary || form.achievements) && (
              <Button onClick={handleSave} isLoading={saving}>
                Simpan Review
              </Button>
            )}
            <div className="ml-auto">
              <select
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                className="bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-emerald-500"
              >
                {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* AI Summary */}
          {aiSummary && !generating && (
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-yellow-400" />
                <p className="text-sm font-semibold text-yellow-400">Ringkasan AI</p>
              </div>
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: aiSummary }}
              />
            </div>
          )}

          {generating && (
            <div className="flex items-center gap-3 p-4 bg-yellow-950/20 rounded-xl border border-yellow-800/50">
              <Sparkles size={18} className="text-yellow-400 animate-pulse" />
              <p className="text-yellow-300 text-sm">AI sedang membuat ringkasan refleksi minggu ini...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riwayat */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Riwayat Review</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : reviews.length === 0 ? (
          <Card><EmptyState icon={Calendar} title="Belum ada riwayat" description="Weekly review pertama kamu akan muncul di sini setelah disimpan" /></Card>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => {
              const isExpanded = expandedIds.has(r.id)
              const mood = MOODS.find(m => m.score === r.mood_score)
              const weekStr = `Minggu ${formatTanggalIndonesia(r.week_start)}`

              return (
                <Card key={r.id}>
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-800/30 transition-colors rounded-xl"
                    onClick={() => toggleExpand(r.id)}
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{mood?.emoji || '📅'}</span>
                        <p className="text-white font-semibold">{weekStr}</p>
                        {r.ai_summary && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-950/50 text-yellow-500 border border-yellow-900">AI ✓</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.achievements || 'Tidak ada catatan pencapaian'}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                      className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-800 p-4 space-y-4">
                      {r.achievements && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">✅ Pencapaian</p>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.achievements}</p>
                        </div>
                      )}
                      {r.challenges && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">🚧 Tantangan</p>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.challenges}</p>
                        </div>
                      )}
                      {r.next_week_goals && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">🎯 Goals Minggu Depan</p>
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">{r.next_week_goals}</p>
                        </div>
                      )}
                      {r.ai_summary && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-yellow-400" />
                            <p className="text-xs text-yellow-400 font-semibold uppercase">Ringkasan AI</p>
                          </div>
                          <div
                            className="prose prose-invert prose-sm max-w-none bg-gray-900 rounded-lg p-4 border border-gray-800"
                            dangerouslySetInnerHTML={{ __html: r.ai_summary }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
