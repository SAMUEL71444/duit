import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  V2_TABLES,
  type V2Table,
  deleteV2RowsWhere,
  insertV2Row,
  listOkrsWithKeyResults,
  listV2Rows,
} from '@/lib/v2-store'

function isV2Table(table: string): table is V2Table {
  return (V2_TABLES as readonly string[]).includes(table)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params
    if (!isV2Table(table)) {
      return NextResponse.json({ error: 'Tabel tidak dikenal' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (table === 'okrs') {
      const data = await listOkrsWithKeyResults(user.id)
      return NextResponse.json(data)
    }

    const orderColumn = request.nextUrl.searchParams.get('order')
    const ascending = request.nextUrl.searchParams.get('asc') !== 'false'
    const data = await listV2Rows(user.id, table, orderColumn ? { order: { column: orderColumn, ascending } } : undefined)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat data'
    const status = message.includes('belum ada di Supabase') ? 503 : 500
    return NextResponse.json({ error: message, code: status === 503 ? 'DB_SETUP_REQUIRED' : undefined }, { status })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params
    if (!isV2Table(table)) {
      return NextResponse.json({ error: 'Tabel tidak dikenal' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await request.json()
    const row = await insertV2Row(user.id, table, payload)
    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params
    if (!isV2Table(table)) {
      return NextResponse.json({ error: 'Tabel tidak dikenal' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const filters = Object.fromEntries(request.nextUrl.searchParams.entries())
    if (Object.keys(filters).length === 0) {
      return NextResponse.json({ error: 'Filter wajib diisi' }, { status: 400 })
    }

    await deleteV2RowsWhere(user.id, table, filters)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
