import { NextResponse } from 'next/server'
import { checkV2Tables } from '@/lib/v2-store'

export async function GET() {
  try {
    const tables = await checkV2Tables()
    const missing = Object.entries(tables).filter(([, ok]) => !ok).map(([name]) => name)
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

    return NextResponse.json({
      projectRef,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      ready: missing.length === 0,
      tables,
      missing,
      sqlEditorUrl: projectRef
        ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
        : null,
      migrationFile: 'supabase/migrations/20250608_all_v2_tables.sql',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal cek status database'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
