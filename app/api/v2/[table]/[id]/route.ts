import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { V2_TABLES, type V2Table, deleteV2Row, updateV2Row } from '@/lib/v2-store'

function isV2Table(table: string): table is V2Table {
  return (V2_TABLES as readonly string[]).includes(table)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params
    if (!isV2Table(table)) {
      return NextResponse.json({ error: 'Tabel tidak dikenal' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await request.json()
    const row = await updateV2Row(user.id, table, id, payload)
    if (!row) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal update data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params
    if (!isV2Table(table)) {
      return NextResponse.json({ error: 'Tabel tidak dikenal' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await deleteV2Row(user.id, table, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
