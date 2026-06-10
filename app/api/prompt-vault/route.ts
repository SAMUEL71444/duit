import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateText } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { system_prompt, user_content, prompt_name, model = 'gemini-3.1-flash-lite' } = body

    if (!user_content) {
      return NextResponse.json({ error: 'user_content wajib diisi' }, { status: 400 })
    }

    const result = await generateText(user_content, system_prompt || undefined, {
      model,
      temperature: 0.7,
      maxOutputTokens: 8192,
    })

    // Increment use_count kalau ada prompt_id
    if (body.prompt_id) {
      try {
        await supabase.rpc('increment_prompt_use_count', { prompt_id: body.prompt_id })
      } catch {
        // ignore error — use count update tidak kritikal
      }
    }

    return NextResponse.json({
      result,
      prompt_name: prompt_name || 'Custom Prompt',
    })
  } catch (error) {
    console.error('Prompt vault API error:', error)
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
