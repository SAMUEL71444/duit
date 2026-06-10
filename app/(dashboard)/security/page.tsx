'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Shield, Search, ExternalLink, Copy, Download } from 'lucide-react'

interface ScanResult {
  domain: string
  ssl?: {
    grade: string
    host: string
    status: string
  } | null
  headers?: {
    grade: string
    score: number
    headers: Record<string, string | null>
  } | null
  analysisHTML: string
}

const HEADER_CHECKS = [
  'Strict-Transport-Security',
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
]

function GradeBadge({ grade }: { grade: string }) {
  const color = grade.startsWith('A') ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
    : grade.startsWith('B') ? 'bg-blue-900/50 text-blue-400 border-blue-700'
    : grade.startsWith('C') ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
    : 'bg-red-900/50 text-red-400 border-red-700'
  return (
    <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl font-black border ${color}`}>
      {grade}
    </span>
  )
}

export default function SecurityPage() {
  const [domain, setDomain] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState('')
  const [model, setModel] = useState('gemini-3.1-flash-lite')

  const AI_MODELS = [
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (Cepat)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Pintar)' },
  ]
  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!cleanDomain) { setError('Masukkan domain yang valid'); return }

    setError('')
    setResult(null)
    setScanning(true)

    try {
      // Langkah 1: ambil basic HTTP headers langsung
      setStep('Memeriksa HTTP security headers...')
      let headersData = null
      try {
        const headersRes = await fetch(`/api/security-check?domain=${encodeURIComponent(cleanDomain)}`)
        if (headersRes.ok) {
          headersData = await headersRes.json()
        }
      } catch { /* ignore — optional */ }

      // Langkah 2: SSL Labs (bisa lama / timeout)
      setStep('Mengecek SSL certificate (bisa 30–60 detik)...')
      let sslData = null
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)
        const sslRes = await fetch(
          `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(cleanDomain)}&startNew=on&fromCache=on&all=done`,
          { signal: controller.signal }
        )
        clearTimeout(timeout)
        if (sslRes.ok) {
          const sslJson = await sslRes.json()
          if (sslJson.endpoints?.length) {
            sslData = {
              grade: sslJson.endpoints[0].grade || '?',
              host: cleanDomain,
              status: sslJson.status,
            }
          }
        }
      } catch { /* SSL Labs timeout — lanjut tanpa SSL */ }

      // Langkah 3: AI analysis
      setStep('AI menganalisis hasil scan...')
      const aiRes = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanDomain,
          ssl_data: sslData,
          headers_data: headersData,
          model,
        }),
      })
      const aiData = await aiRes.json()
      if (!aiRes.ok) throw new Error(aiData.error || 'Gagal analisis AI')

      setResult({
        domain: cleanDomain,
        ssl: sslData,
        headers: headersData,
        analysisHTML: aiData.html,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat scan')
    } finally {
      setScanning(false)
      setStep('')
    }
  }

  function handleCopyReport() {
    if (!result) return
    const div = document.createElement('div')
    div.innerHTML = result.analysisHTML
    navigator.clipboard.writeText(div.innerText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrintReport() {
    if (!result) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Security Report — ${result.domain}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #111; }
            h1,h2,h3 { color: #1a1a1a; }
            .grade-a { color: #059669; font-weight: bold; }
            .grade-b { color: #2563eb; font-weight: bold; }
            .grade-c { color: #d97706; font-weight: bold; }
            .grade-d,.grade-f { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Security Report: ${result.domain}</h1>
          <p>Dianalisis pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          ${result.analysisHTML}
        </body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Security Advisor</h1>
        <p className="text-gray-400 text-sm mt-1">Analisis keamanan website klien — SSL + HTTP headers + laporan AI profesional</p>
      </div>

      {error && <ErrorBanner type="error" message={error} dismissible />}

      {/* Scan Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="flex-1">
              <Input
                id="security-domain"
                label=""
                placeholder="contoh.com / tokopedia.com / kliensaya.co.id"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                type="text"
              />
            </div>
            <div className="w-64">
              <Select
                id="security-model"
                label=""
                value={model}
                onChange={e => setModel(e.target.value)}
                options={AI_MODELS}
              />
            </div>
            <Button type="submit" isLoading={scanning} className="mt-0 shrink-0 self-end">
              <Search size={16} />
              {scanning ? 'Scanning...' : 'Scan Sekarang'}
            </Button>
          </form>
          {scanning && step && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-blue-950/30 rounded-lg border border-blue-800/50">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-blue-300 text-sm">{step}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info penjelasan */}
      {!result && !scanning && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'SSL/TLS Check', desc: 'Grade dari SSL Labs (A+, A, B, C, D, F) + detail sertifikat' },
            { icon: Shield, title: 'HTTP Headers', desc: 'Check 6 security headers penting: HSTS, CSP, X-Frame-Options, dll' },
            { icon: Shield, title: 'AI Analysis', desc: 'Laporan lengkap dalam bahasa Indonesia, siap dikirim ke klien' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-950/50 rounded-lg border border-emerald-800/50 shrink-0">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{title}</p>
                    <p className="text-gray-500 text-xs mt-1">{desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Score overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>SSL/TLS Grade</CardTitle></CardHeader>
              <CardContent>
                {result.ssl ? (
                  <div className="flex items-center gap-4">
                    <GradeBadge grade={result.ssl.grade} />
                    <div>
                      <p className="text-white font-semibold">{result.domain}</p>
                      <p className="text-gray-500 text-xs mt-1">via SSL Labs</p>
                      <a
                        href={`https://www.ssllabs.com/ssltest/analyze.html?d=${result.domain}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 flex items-center gap-1 mt-1 hover:underline"
                      >
                        Lihat detail lengkap <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-yellow-400 text-sm font-medium">Tidak tersedia</p>
                    <p className="text-gray-500 text-xs mt-1">SSL Labs timeout atau domain tidak ditemukan</p>
                    <a
                      href={`https://www.ssllabs.com/ssltest/analyze.html?d=${result.domain}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 flex items-center gap-1 mt-2 hover:underline"
                    >
                      Cek manual di SSL Labs <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Security Headers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {HEADER_CHECKS.map(header => {
                    const present = result.headers?.headers?.[header] !== null && result.headers?.headers?.[header] !== undefined
                    return (
                      <div key={header} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 font-mono text-xs">{header}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${present ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'}`}>
                          {present ? '✓ Ada' : '✗ Hilang'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis */}
          <Card className="border-emerald-800/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={18} className="text-emerald-400" />
                Laporan AI — {result.domain}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleCopyReport}>
                  <Copy size={14} />{copied ? 'Tersalin!' : 'Copy Laporan'}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrintReport}>
                  <Download size={14} />Print / PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-invert prose-sm max-w-none bg-gray-900 rounded-lg p-6 border border-gray-800 max-h-[70vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: result.analysisHTML }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
