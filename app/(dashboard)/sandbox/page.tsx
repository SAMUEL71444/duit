'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, CheckCircle, Code, Layout, Palette, Zap } from 'lucide-react'
import { formatRupiah } from '@/lib/export'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { ErrorBanner } from '@/components/ui/error-banner'
import { SkeletonCard } from '@/components/ui/skeleton'

interface CodeBlock {
  title: string
  code: string
  lang: string
  desc: string
}

const COMPONENTS: { category: string; icon: typeof Code; items: CodeBlock[] }[] = [
  {
    category: 'UI Components',
    icon: Layout,
    items: [
      {
        title: 'StatCard',
        lang: 'tsx',
        desc: 'Kartu statistik dengan ikon dan subtitle',
        code: `<StatCard
  title="Revenue Bulan Ini"
  value="Rp 15.500.000"
  subtitle="+12% dari bulan lalu"
  highlight
  icon={<TrendingUp size={18} />}
/>`,
      },
      {
        title: 'ErrorBanner',
        lang: 'tsx',
        desc: 'Alert banner untuk error / warning / info / success',
        code: `<ErrorBanner type="error" message="Gagal menyimpan data." />
<ErrorBanner type="warning" title="Perhatian" message="Data belum disimpan." />
<ErrorBanner type="info" message="Fitur ini masih dalam beta." />
<ErrorBanner type="success" message="Data berhasil disimpan!" />`,
      },
      {
        title: 'Badge',
        lang: 'tsx',
        desc: 'Badge status berwarna',
        code: `<Badge variant="success">Aktif</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Overdue</Badge>
<Badge variant="info">Draft</Badge>`,
      },
    ],
  },
  {
    category: 'Hooks & Utils',
    icon: Zap,
    items: [
      {
        title: 'formatRupiah',
        lang: 'ts',
        desc: 'Format angka ke format Rupiah IDR',
        code: `import { formatRupiah, formatRupiahSingkat } from '@/lib/export'

formatRupiah(15500000)    // → "Rp 15.500.000"
formatRupiahSingkat(15500000) // → "Rp 15,5 Jt"`,
      },
      {
        title: 'formatDurasi',
        lang: 'ts',
        desc: 'Format detik ke jam:menit untuk time log',
        code: `import { formatDurasi } from '@/lib/export'

formatDurasi(3600)  // → "1j 0m"
formatDurasi(5400)  // → "1j 30m"
formatDurasi(900)   // → "15m 0d"`,
      },
      {
        title: 'exportToCSV / exportToJSON',
        lang: 'ts',
        desc: 'Export data ke file CSV atau JSON',
        code: `import { exportToCSV, exportToJSON } from '@/lib/export'

// Export array of objects ke CSV
exportToCSV(data, 'nama-file')

// Export object ke JSON
exportToJSON({ data, summary }, 'nama-file')`,
      },
    ],
  },
  {
    category: 'Supabase Patterns',
    icon: Code,
    items: [
      {
        title: 'Fetch with Auth',
        lang: 'ts',
        desc: 'Pattern standar fetch data dengan Supabase',
        code: `const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

if (error) throw error`,
      },
      {
        title: 'Insert / Upsert',
        lang: 'ts',
        desc: 'Tambah data baru ke Supabase',
        code: `// Insert
await supabase.from('table').insert({
  user_id: user.id,
  field: value,
})

// Upsert (insert or update)
await supabase.from('table').upsert({
  user_id: user.id,
  unique_field: value,
  data: newData,
})`,
      },
      {
        title: 'Gemini AI Call',
        lang: 'ts',
        desc: 'Pattern call Gemini API dari route handler',
        code: `import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
})
const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''`,
      },
    ],
  },
]

export default function SandboxPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('UI Components')

  function handleCopy(code: string, title: string) {
    navigator.clipboard.writeText(code)
    setCopied(title)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeGroup = COMPONENTS.find(g => g.category === activeCategory)

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Component Sandbox</h1>
        <p className="text-gray-400 text-sm mt-1">Library komponen UI, utility functions, dan pattern kode yang digunakan di project ini</p>
      </div>

      {/* Live preview components */}
      <Card>
        <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* StatCards demo */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">StatCard variants</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard title="Revenue" value={formatRupiah(15500000)} subtitle="+12% bulan lalu" highlight icon={<Zap size={16} />} />
                <StatCard title="Klien Aktif" value="8" subtitle="dari 12 total" icon={<Layout size={16} />} />
                <StatCard title="Jam Kerja" value="42.5j" subtitle="minggu ini" icon={<Code size={16} />} />
                <StatCard title="FIRE Progress" value="34%" subtitle="menuju target" icon={<Palette size={16} />} />
              </div>
            </div>

            {/* Badges demo */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Badge variants</p>
              <div className="flex gap-3 flex-wrap">
                <Badge variant="success">On Track</Badge>
                <Badge variant="warning">At Risk</Badge>
                <Badge variant="danger">Off Track</Badge>
                <Badge variant="info">Draft</Badge>
                <Badge variant="default">Default</Badge>
              </div>
            </div>

            {/* ErrorBanner demo */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">ErrorBanner types</p>
              <div className="space-y-2">
                <ErrorBanner type="success" message="Data berhasil disimpan!" />
                <ErrorBanner type="info" message="Fitur ini masih dalam beta." />
                <ErrorBanner type="warning" title="Perhatian" message="Kamu punya 3 tagihan jatuh tempo minggu ini." />
                <ErrorBanner type="error" message="Gagal memuat data. Coba refresh." />
              </div>
            </div>

            {/* Skeleton demo */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Skeleton loading</p>
              <div className="grid grid-cols-2 gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code snippets */}
      <div>
        {/* Category tabs */}
        <div className="flex gap-2 mb-4">
          {COMPONENTS.map(g => {
            const Icon = g.icon
            return (
              <button
                key={g.category}
                onClick={() => setActiveCategory(g.category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${activeCategory === g.category ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'}`}
              >
                <Icon size={14} />{g.category}
              </button>
            )
          })}
        </div>

        {/* Code blocks */}
        <div className="space-y-4">
          {activeGroup?.items.map(item => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">{item.lang}</span>
                  <span className="text-xs text-gray-500">{item.desc}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 overflow-x-auto font-mono leading-relaxed">
                    <code>{item.code}</code>
                  </pre>
                  <button
                    onClick={() => handleCopy(item.code, item.title)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    {copied === item.title ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
