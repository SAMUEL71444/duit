import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateText } from '@/lib/gemini'

const SYSTEM_PROMPT = `Kamu adalah business coach dan financial advisor untuk freelancer Indonesia.
Tugasmu adalah membuat weekly review yang insightful dan actionable berdasarkan data keuangan dan produktivitas.

Format output sebagai HTML yang terstruktur dengan:
1. Ringkasan Minggu Ini (highlight positif dan tantangan)
2. Analisis Refleksi (pencapaian dan hambatan)
3. 3 Prioritas Aksi Minggu Depan (konkret dan spesifik)
4. Motivasi penutup yang personal

Gunakan bahasa Indonesia yang hangat, jujur, dan memotivasi.
PENTING: Output HARUS langsung berupa elemen HTML (seperti <h1>, <p>, <ul>) tanpa tag <html>, <head>, <body>, <!DOCTYPE html>, atau <style>. Jangan gunakan blok markdown.
Jangan terlalu panjang — fokus pada insight yang actionable.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { week_start, achievements, challenges, next_week_goals, mood_score, model = 'gemini-3.1-flash-lite' } = body

    const prompt = `Buat weekly review berdasarkan data refleksi berikut:

MINGGU: ${week_start}
PENCAPAIAN: ${achievements || 'Tidak ada/belum diisi'}
TANTANGAN: ${challenges || 'Tidak ada/belum diisi'}
GOALS MINGGU DEPAN: ${next_week_goals || 'Tidak ada/belum diisi'}
MOOD SCORE (1-5): ${mood_score}

Berikan review yang hangat, jujur, insightful, dan berikan 3 prioritas aksi yang konkret untuk minggu depan.`

    let html = await generateText(prompt, SYSTEM_PROMPT, {
      model,
      temperature: 0.7,
      maxOutputTokens: 3072,
    })

    html = html.replace(/^```(html)?\s*/i, '').replace(/```\s*$/i, '')

    return NextResponse.json({ summary: html })
  } catch (error) {
    console.error('Weekly review API error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
