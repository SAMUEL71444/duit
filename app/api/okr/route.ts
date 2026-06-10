import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateJSON } from '@/lib/gemini'

const SYSTEM_PROMPT = `Kamu adalah productivity coach dan OKR specialist.
Tugasmu adalah memecah sebuah goal besar menjadi milestones mingguan yang konkret dan achievable.

Output WAJIB dalam format JSON dengan struktur berikut:
{
  "milestones": [
    {
      "week_number": 1,
      "title": "Judul milestone yang spesifik",
      "due_date": "YYYY-MM-DD",
      "description": "Penjelasan singkat apa yang harus dicapai"
    }
  ]
}

Pastikan:
- Setiap milestone jelas dan measurable
- Urutan logis (fondasi dulu, lalu implementasi, lalu polish)
- Realistis untuk dikerjakan dalam 1 minggu
- Bahasa Indonesia yang jelas`

interface Milestone {
  week_number: number
  title: string
  due_date: string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, deadline, context, duration_weeks, model = 'gemini-3.1-flash-lite' } = body

    if (!title) {
      return NextResponse.json({ error: 'title wajib diisi' }, { status: 400 })
    }

    const weeks = duration_weeks || 8
    const startDate = new Date()

    const prompt = `Pecah goal berikut menjadi ${weeks} milestone mingguan:

Goal: ${title}
Deadline: ${deadline || 'Tidak ditentukan'}
Konteks tambahan: ${context || 'Tidak ada'}
Tanggal mulai: ${startDate.toISOString().split('T')[0]}

Buat ${weeks} milestone mingguan yang konkret, terukur, dan realistis.`

    const result = await generateJSON<{ milestones: Milestone[] }>(prompt, SYSTEM_PROMPT, {
      model,
      temperature: 0.5,
    })

    return NextResponse.json({ milestones: result.milestones || [] })
  } catch (error) {
    console.error('OKR API error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
