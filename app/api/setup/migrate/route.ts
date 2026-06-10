import { NextRequest, NextResponse } from 'next/server'
import { runV2Migration } from '@/lib/run-migration'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runV2Migration()
    return NextResponse.json({ ok: true, message: 'V2 tables migration applied.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Migration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
