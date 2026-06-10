import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Check HTTP security headers dari sebuah domain
// Ini berjalan di server — bypass CORS
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    if (!domain) return NextResponse.json({ error: 'domain wajib diisi' }, { status: 400 })

    const url = `https://${domain}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const CHECKED_HEADERS = [
      'strict-transport-security',
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy',
      'x-xss-protection',
      'cross-origin-embedder-policy',
      'cross-origin-opener-policy',
    ]

    const headers: Record<string, string | null> = {}
    CHECKED_HEADERS.forEach(h => {
      headers[h] = res.headers.get(h)
    })

    const presentCount = Object.values(headers).filter(v => v !== null).length
    const totalCount = CHECKED_HEADERS.length
    const score = Math.round((presentCount / totalCount) * 100)

    let grade = 'F'
    if (score >= 90) grade = 'A+'
    else if (score >= 80) grade = 'A'
    else if (score >= 70) grade = 'B'
    else if (score >= 60) grade = 'C'
    else if (score >= 50) grade = 'D'

    return NextResponse.json({
      grade,
      score,
      headers,
      checked_url: url,
      status_code: res.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal fetch headers'
    if (message.includes('abort')) {
      return NextResponse.json({ error: 'Request timeout (10s)' }, { status: 408 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
