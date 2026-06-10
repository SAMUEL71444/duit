import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateText } from '@/lib/gemini'

const SYSTEM_PROMPT = `Kamu adalah konsultan bisnis senior dengan pengalaman lebih dari 15 tahun.
Tugasmu adalah menulis proposal bisnis yang profesional, persuasif, dan terstruktur dengan baik.

Struktur proposal yang wajib ada:
1. Pembuka yang hangat dan personal
2. Pemahaman Kebutuhan Klien
3. Solusi yang Ditawarkan
4. Deliverables (daftar jelas apa yang akan diterima klien)
5. Timeline Pengerjaan
6. Investasi (harga dengan breakdown)
7. Mengapa Memilih Kami
8. Call to Action penutup

Gunakan bahasa yang formal tapi tidak kaku, sesuaikan dengan instruksi bahasa pada prompt klien.
PENTING: Output HARUS langsung berupa elemen HTML (seperti <h1>, <p>, <ul>) tanpa tag <html>, <head>, <body>, <!DOCTYPE html>, atau <style>. Jangan gunakan blok markdown seperti \`\`\`html. Kembalikan raw HTML murni saja.
Gunakan heading yang jelas, bullet points, dan pastikan mudah dibaca.
Jangan gunakan placeholder — isi semua bagian dengan konten yang relevan berdasarkan input.`

export async function POST(request: NextRequest) {
  try {
    // Verifikasi auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      client_name,
      project_type,
      budget_range,
      timeline,
      deliverables,
      company_name,
      language = 'id',
      model = 'gemini-3.1-flash-lite',
    } = body

    // Validasi input
    if (!client_name || !project_type) {
      return NextResponse.json(
        { error: 'client_name dan project_type wajib diisi' },
        { status: 400 }
      )
    }

    const langInstruction = language === 'en' 
      ? 'PENTING: Tulis seluruh proposal DALAM BAHASA INGGRIS (English) yang profesional.' 
      : 'PENTING: Tulis seluruh proposal DALAM BAHASA INDONESIA yang profesional.'

    const prompt = `Buat proposal profesional untuk klien berikut:

Nama Klien: ${client_name}
Jenis Project: ${project_type}
Budget Range: ${budget_range || 'Belum ditentukan'}
Timeline: ${timeline || 'Fleksibel'}
Deliverables: ${deliverables || 'Akan didiskusikan lebih lanjut'}
Nama Perusahaan/Freelancer: ${company_name || 'Freelancer Professional'}

${langInstruction}
Buat proposal yang komprehensif, profesional, dan meyakinkan klien untuk memilih kita.`

    let html = await generateText(prompt, SYSTEM_PROMPT, {
      model,
      temperature: 0.7,
      maxOutputTokens: 4096,
    })

    // Bersihkan markdown blok jika AI tetap mengeluarkannya
    html = html.replace(/^```(html)?\s*/i, '').replace(/```\s*$/i, '')

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Proposal API error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
