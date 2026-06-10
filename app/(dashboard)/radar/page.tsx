'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/ui/error-banner'
import { SkeletonTable } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { exportToCSV } from '@/lib/export'
import { ShieldAlert, RefreshCw, Download, Plus, Trash2, ExternalLink, Search } from 'lucide-react'

interface CVEItem {
  id: string
  cveId: string
  description: string
  severity: string
  cvss: number | null
  published: string
  references: string[]
  matched_keyword: string
}

interface KeywordRow {
  id: string
  keyword: string
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-950/50 border-red-800' },
  HIGH:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-950/50 border-orange-800' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-800' },
  LOW:      { label: 'Low',      color: 'text-blue-400', bg: 'bg-blue-950/50 border-blue-800' },
  NONE:     { label: 'None',     color: 'text-gray-400', bg: 'bg-gray-800 border-gray-700' },
}

const STORAGE_KEY = 'radar_keywords'
const DEFAULT_KEYWORDS = ['wordpress', 'nginx', 'php', 'mysql', 'openssl']

export default function RadarPage() {
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [cves, setCVEs] = useState<CVEItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [filterSeverity, setFilterSeverity] = useState('')

  // Load keywords dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setKeywords(JSON.parse(stored)) } catch { setKeywords(DEFAULT_KEYWORDS) }
    } else {
      setKeywords(DEFAULT_KEYWORDS)
    }
  }, [])

  function saveKeywords(kws: string[]) {
    setKeywords(kws)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kws))
  }

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase()
    if (!kw || keywords.includes(kw)) { setNewKeyword(''); return }
    saveKeywords([...keywords, kw])
    setNewKeyword('')
  }

  function removeKeyword(kw: string) {
    saveKeywords(keywords.filter(k => k !== kw))
  }

  // ============================================================
  // Fetch CVEs dari NVD API (via CORS-free server proxy later)
  // Sementara pakai NVD API langsung — public, no auth needed untuk basic
  // ============================================================
  const fetchCVEs = useCallback(async () => {
    if (keywords.length === 0) { setError('Tambah keyword dulu'); return }
    setFetching(true)
    setError('')
    setCVEs([])

    try {
      const all: CVEItem[] = []
      const seenIds = new Set<string>()

      // Fetch per keyword — NVD API v2 (gratis, no key needed)
      for (const kw of keywords.slice(0, 5)) {
        try {
          const res = await fetch(
            `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(kw)}&pubStartDate=${getDateDaysAgo(30)}&resultsPerPage=10`,
            { headers: { 'Accept': 'application/json' } }
          )
          if (!res.ok) continue
          const data = await res.json()
          const items = data.vulnerabilities || []

          for (const item of items) {
            const cve = item.cve
            const id = cve.id
            if (seenIds.has(id)) continue
            seenIds.add(id)

            const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0]
            const cvss = metrics?.cvssData?.baseScore ?? null
            const severity = metrics?.cvssData?.baseSeverity ?? (cvss ? scoreToCVSS(cvss) : 'NONE')
            const desc = cve.descriptions?.find((d: { lang: string; value: string }) => d.lang === 'en')?.value || 'No description'
            const refs = (cve.references || []).slice(0, 3).map((r: { url: string }) => r.url)

            all.push({
              id: cve.id,
              cveId: cve.id,
              description: desc,
              severity: severity.toUpperCase(),
              cvss,
              published: cve.published,
              references: refs,
              matched_keyword: kw,
            })
          }
        } catch { /* skip failed keyword */ }

        // Rate limit NVD: 5 req/30s without key
        await new Promise(r => setTimeout(r, 700))
      }

      // Sort by severity then published
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 }
      all.sort((a, b) => {
        const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 5
        const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 5
        if (sa !== sb) return sa - sb
        return new Date(b.published).getTime() - new Date(a.published).getTime()
      })

      setCVEs(all)
      setLastFetch(new Date())
    } catch (err) {
      setError('Gagal fetch CVE data. Coba lagi.')
    } finally {
      setFetching(false)
    }
  }, [keywords])

  function getDateDaysAgo(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('.')[0] + '+00:00'
  }

  function scoreToCVSS(score: number): string {
    if (score >= 9) return 'CRITICAL'
    if (score >= 7) return 'HIGH'
    if (score >= 4) return 'MEDIUM'
    return 'LOW'
  }

  function formatPublished(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filtered = cves.filter(c => !filterSeverity || c.severity === filterSeverity)
  const criticalCount = cves.filter(c => c.severity === 'CRITICAL').length
  const highCount = cves.filter(c => c.severity === 'HIGH').length

  function handleExport() {
    exportToCSV(cves.map(c => ({
      cve_id: c.cveId, severity: c.severity, cvss: c.cvss, keyword: c.matched_keyword,
      published: c.published, description: c.description.slice(0, 200),
    })), 'cve-radar')
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert size={24} className="text-red-400" />Zero-Day Radar
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitor CVE baru dari NVD (30 hari terakhir) sesuai keyword stack kamu
            {lastFetch && <span className="ml-2 text-gray-600">· Update: {lastFetch.toLocaleTimeString('id-ID')}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {cves.length > 0 && <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} />CSV</Button>}
          <Button onClick={fetchCVEs} isLoading={fetching} variant={fetching ? 'secondary' : 'primary'}>
            <RefreshCw size={14} />{fetching ? `Scanning ${keywords.length} keyword...` : 'Scan CVE Sekarang'}
          </Button>
        </div>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Keywords manager */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords Stack Kamu</CardTitle>
          <span className="text-xs text-gray-500">Disimpan di browser · Maks 10 keyword</span>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Input
                id="radar-kw"
                label=""
                placeholder="nginx / wordpress / laravel / mysql..."
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()}
              />
            </div>
            <Button onClick={addKeyword} variant="secondary" className="self-end" disabled={keywords.length >= 10}>
              <Plus size={14} />Tambah
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-sm text-gray-300">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="text-gray-500 hover:text-red-400 transition-colors ml-0.5">
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
            {keywords.length === 0 && <p className="text-gray-600 text-sm">Belum ada keyword.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {cves.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total CVE" value={String(cves.length)} subtitle="30 hari terakhir" highlight icon={<ShieldAlert size={18} />} />
          <StatCard title="Critical" value={String(criticalCount)} subtitle="segera patch!" icon={<ShieldAlert size={18} />} />
          <StatCard title="High" value={String(highCount)} subtitle="prioritas tinggi" icon={<ShieldAlert size={18} />} />
          <StatCard title="Keywords" value={String(keywords.length)} subtitle="dipantau" icon={<Search size={18} />} />
        </div>
      )}

      {/* Filter severity */}
      {cves.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterSeverity('')} className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${!filterSeverity ? 'border-emerald-600 bg-emerald-950/30 text-emerald-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
            Semua ({cves.length})
          </button>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
            const count = cves.filter(c => c.severity === sev).length
            if (count === 0) return null
            const cfg = SEVERITY_CONFIG[sev]
            return (
              <button key={sev} onClick={() => setFilterSeverity(sev === filterSeverity ? '' : sev)} className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${filterSeverity === sev ? `${cfg.bg} ${cfg.color}` : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* CVE List */}
      {fetching ? (
        <Card><CardContent className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-red-400">
            <RefreshCw size={20} className="animate-spin" />
            <span>Mengambil data CVE dari NVD untuk {keywords.length} keyword... (~{keywords.length * 2}s)</span>
          </div>
        </CardContent></Card>
      ) : cves.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="Belum ada data CVE"
            description="Klik 'Scan CVE Sekarang' untuk mengambil data kerentanan 30 hari terakhir dari NVD berdasarkan keyword stack kamu"
            actionLabel="Scan Sekarang"
            onAction={fetchCVEs}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(cve => {
            const cfg = SEVERITY_CONFIG[cve.severity] || SEVERITY_CONFIG.NONE
            return (
              <Card key={cve.id} className={`border ${cve.severity === 'CRITICAL' ? 'border-red-900/60' : cve.severity === 'HIGH' ? 'border-orange-900/60' : 'border-gray-800'}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      {cve.cvss !== null && <p className="text-xs text-gray-500 mt-1 font-mono">CVSS {cve.cvss.toFixed(1)}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${cve.cveId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-white font-bold text-sm hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          {cve.cveId} <ExternalLink size={11} />
                        </a>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{cve.matched_keyword}</span>
                        <span className="text-xs text-gray-600">{formatPublished(cve.published)}</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-2 line-clamp-3 leading-relaxed">{cve.description}</p>
                      {cve.references.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {cve.references.map((ref, i) => (
                            <a key={i} href={ref} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate max-w-[200px]">
                              {new URL(ref).hostname}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ErrorBanner type="info" message="Data CVE diambil langsung dari NVD (National Vulnerability Database) NIST. Rate limit: 5 request/30 detik. Tambah NVD API key di environment untuk limit lebih tinggi." />
    </div>
  )
}
