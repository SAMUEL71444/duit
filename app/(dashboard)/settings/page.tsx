'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/ui/error-banner'
import { StatCard } from '@/components/ui/stat-card'
import { User, Bell, Palette, Database, Key, Check, AlertTriangle } from 'lucide-react'

interface UserProfile {
  email: string
  name: string
  avatar_url: string | null
}

interface AppSettings {
  currency: string
  language: string
  theme: string
  emailDigest: boolean
  dcaReminder: boolean
}

const SETTINGS_KEY = 'app_settings'

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'IDR',
  language: 'id',
  theme: 'dark',
  emailDigest: false,
  dcaReminder: true,
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')
  const [nameEdit, setNameEdit] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications' | 'data'>('profile')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setProfile({
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        setNameEdit(user.user_metadata?.full_name || user.email?.split('@')[0] || '')

        const stored = localStorage.getItem(SETTINGS_KEY)
        if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      } catch { setError('Gagal memuat profil.') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  function saveSettings(updated: Partial<AppSettings>) {
    const next = { ...settings, ...updated }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    setSaveMsg('Tersimpan!')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  async function handleSaveName() {
    if (!nameEdit.trim()) return
    setSaving(true)
    try {
      await supabase.auth.updateUser({ data: { full_name: nameEdit } })
      setProfile(prev => prev ? { ...prev, name: nameEdit } : null)
      setSaveMsg('Nama diperbarui!')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch { setError('Gagal update nama.') }
    finally { setSaving(false) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleExportAllData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tables = ['budget_categories', 'transactions', 'crm_deals', 'time_logs', 'portfolio_holdings', 'dca_schedules', 'dca_executions', 'okrs', 'weekly_reviews', 'prompts', 'subscriptions']
      const exported: Record<string, unknown[]> = {}

      for (const t of tables) {
        const { data } = await supabase.from(t).select('*').eq('user_id', user.id)
        exported[t] = data || []
      }

      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wealth-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSaveMsg('Data berhasil diexport!')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch { setError('Gagal export data.') }
  }

  const TABS = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'preferences' as const, label: 'Preferensi', icon: Palette },
    { id: 'notifications' as const, label: 'Notifikasi', icon: Bell },
    { id: 'data' as const, label: 'Data & Privasi', icon: Database },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-gray-400 text-sm mt-1">Konfigurasi profil dan preferensi dashboard kamu</p>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}
      {saveMsg && <ErrorBanner type="success" message={saveMsg} />}

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informasi Akun</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                  {profile?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-white font-semibold">{profile?.name}</p>
                  <p className="text-gray-500 text-sm">{profile?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input id="settings-name" label="Nama Tampilan" value={nameEdit} onChange={e => setNameEdit(e.target.value)} placeholder="Nama kamu" />
                  </div>
                  <Button onClick={handleSaveName} isLoading={saving} className="self-end">Simpan</Button>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-1.5">Email</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 text-sm">
                    {profile?.email}
                    <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1"><Check size={11} />Terverifikasi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-900/40">
            <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle size={16} />Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Keluar dari akun</p>
                  <p className="text-gray-500 text-xs mt-0.5">Kamu akan diarahkan ke halaman login</p>
                </div>
                <Button variant="danger" size="sm" onClick={handleSignOut}>Sign Out</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Tampilan & Format</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Tema</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['dark', 'darker'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => saveSettings({ theme: t })}
                      className={`p-4 rounded-xl border text-sm font-medium transition-all ${settings.theme === t ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
                    >
                      {t === 'dark' ? '🌙 Dark' : '⚫ Darker'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Mata Uang Default</label>
                <div className="grid grid-cols-3 gap-3">
                  {['IDR', 'USD', 'SGD'].map(c => (
                    <button
                      key={c}
                      onClick={() => saveSettings({ currency: c })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${settings.currency === c ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Bahasa</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: 'id', label: '🇮🇩 Bahasa Indonesia' }, { value: 'en', label: '🇬🇧 English' }].map(l => (
                    <button
                      key={l.value}
                      onClick={() => saveSettings({ language: l.value })}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${settings.language === l.value ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Pengaturan Notifikasi</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'dcaReminder' as const, title: 'DCA Reminder', desc: 'Ingatkan saat jadwal DCA jatuh tempo hari ini', icon: Bell },
                { key: 'emailDigest' as const, title: 'Email Weekly Digest', desc: 'Ringkasan mingguan dikirim via email (butuh Resend setup)', icon: Bell },
              ].map(({ key, title, desc, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg"><Icon size={16} className="text-gray-400" /></div>
                    <div>
                      <p className="text-white text-sm font-medium">{title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => saveSettings({ [key]: !settings[key] })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] ? 'bg-emerald-600' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
              <ErrorBanner type="info" message="Notifikasi browser tidak didukung saat ini. DCA reminder muncul sebagai alert di halaman dashboard saat kamu login." />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Database size={18} />Export Data</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">Download semua data kamu dari Supabase dalam format JSON. Meliputi: Budget, CRM, Portfolio, DCA, OKR, Weekly Review, Prompts, dan Subscriptions.</p>
              <Button onClick={handleExportAllData} variant="secondary" className="w-full">
                <Database size={16} />Export Semua Data (JSON)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Key size={18} />Informasi Teknis</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Database', value: 'Supabase PostgreSQL (Free Tier)' },
                  { label: 'AI Model', value: 'Google Gemini 2.0 Flash' },
                  { label: 'Auth', value: 'Supabase Auth (Email + Password)' },
                  { label: 'Stock Data', value: 'Yahoo Finance API (via server proxy)' },
                  { label: 'CVE Data', value: 'NVD NIST API v2 (public)' },
                  { label: 'Framework', value: 'Next.js 16.2.7 (App Router)' },
                  { label: 'Hosting', value: 'Vercel Free Tier' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-300">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
