import { createClient } from '@supabase/supabase-js'

export const V2_TABLES = [
  'proposals',
  'portfolio_holdings',
  'subscriptions',
  'dca_executions',
  'okrs',
  'key_results',
  'weekly_reviews',
  'prompts',
] as const

export type V2Table = (typeof V2_TABLES)[number]

type Row = Record<string, unknown>

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isMissingTableError(error: { code?: string } | null) {
  return error?.code === 'PGRST205'
}

export async function checkV2Tables(): Promise<Record<V2Table, boolean>> {
  const result = {} as Record<V2Table, boolean>
  await Promise.all(
    V2_TABLES.map(async table => {
      const { error } = await serviceClient().from(table).select('id').limit(1)
      result[table] = !isMissingTableError(error)
    })
  )
  return result
}

function missingTableMessage(table: V2Table) {
  const project = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  return (
    `Tabel '${table}' belum ada di Supabase project ${project ?? '?'}. ` +
    'Jalankan supabase/migrations/20250608_all_v2_tables.sql di SQL Editor project yang sama dengan .env.local, lalu: NOTIFY pgrst, \'reload schema\';'
  )
}

function sortRows(rows: Row[], order?: { column: string; ascending?: boolean }) {
  if (!order) return rows
  const { column, ascending = true } = order
  return [...rows].sort((a, b) => {
    const av = a[column]
    const bv = b[column]
    if (av === bv) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (av < bv) return ascending ? -1 : 1
    if (av > bv) return ascending ? 1 : -1
    return 0
  })
}

export async function listV2Rows(
  userId: string,
  table: V2Table,
  options?: { order?: { column: string; ascending?: boolean } }
): Promise<Row[]> {
  let query = serviceClient().from(table).select('*').eq('user_id', userId)
  if (options?.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
  }
  const { data, error } = await query
  if (isMissingTableError(error)) throw new Error(missingTableMessage(table))
  if (error) throw error
  return sortRows((data || []) as Row[], options?.order)
}

export async function insertV2Row(userId: string, table: V2Table, payload: Row): Promise<Row> {
  const row = { ...payload, user_id: userId }
  const { data, error } = await serviceClient().from(table).insert(row).select('*').single()
  if (isMissingTableError(error)) throw new Error(missingTableMessage(table))
  if (error) throw error
  return data as Row
}

export async function updateV2Row(
  userId: string,
  table: V2Table,
  id: string,
  payload: Row
): Promise<Row> {
  const { data, error } = await serviceClient()
    .from(table)
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (isMissingTableError(error)) throw new Error(missingTableMessage(table))
  if (error) throw error
  return data as Row
}

export async function deleteV2Row(userId: string, table: V2Table, id: string): Promise<void> {
  const { error } = await serviceClient().from(table).delete().eq('id', id).eq('user_id', userId)
  if (isMissingTableError(error)) throw new Error(missingTableMessage(table))
  if (error) throw error
}

export async function deleteV2RowsWhere(
  userId: string,
  table: V2Table,
  filters: Record<string, string>
): Promise<void> {
  let query = serviceClient().from(table).delete().eq('user_id', userId)
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }
  const { error } = await query
  if (isMissingTableError(error)) throw new Error(missingTableMessage(table))
  if (error) throw error
}

export async function listOkrsWithKeyResults(userId: string) {
  const [okrs, keyResults] = await Promise.all([
    listV2Rows(userId, 'okrs', { order: { column: 'created_at', ascending: false } }),
    listV2Rows(userId, 'key_results'),
  ])

  return okrs.map(okr => ({
    ...okr,
    key_results: keyResults.filter(kr => kr.okr_id === okr.id),
  }))
}
