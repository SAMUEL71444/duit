import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateText } from '@/lib/gemini'

const SYSTEM_PROMPT = `Kamu adalah security consultant senior yang ahli di web security, SSL/TLS, dan HTTP security headers.
Tugasmu adalah menganalisis hasil scan keamanan sebuah domain/website dan menghasilkan laporan yang:
1. Mudah dipahami klien non-teknis
2. Jelas menjelaskan risiko dari setiap temuan
3. Memberikan rekomendasi konkret yang bisa langsung diimplementasikan
4. Menggunakan bahasa Indonesia yang profesional
5. Format output sebagai HTML yang terstruktur dengan baik

Gunakan rating: Kritis (merah), Tinggi (oranye), Sedang (kuning), Rendah (hijau).
Sertakan estimasi tingkat kesulitan implementasi perbaikan.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { domain, ssl_data, headers_data, model = 'gemini-3.1-flash-lite' } = body

    if (!domain) {
      return NextResponse.json({ error: 'domain wajib diisi' }, { status: 400 })
    }

    const prompt = `Analisis hasil security scan untuk domain: ${domain}

Data SSL Labs:
${ssl_data ? JSON.stringify(ssl_data, null, 2) : 'Tidak tersedia atau timeout'}

Data Security Headers:
${headers_data ? JSON.stringify(headers_data, null, 2) : 'Tidak tersedia'}

Buat laporan keamanan komprehensif yang bisa dipahami klien dan jelaskan langkah perbaikannya.`

    let html = await generateText(prompt, SYSTEM_PROMPT, {
      model,
      temperature: 0.4,
      maxOutputTokens: 6144,
    })

    return NextResponse.json({ html, domain })
  } catch (error) {
    console.error('Security API error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
