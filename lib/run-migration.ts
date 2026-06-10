import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const MIGRATION_FILE = 'supabase/migrations/20250608_all_v2_tables.sql'

export async function runV2Migration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  const password = process.env.SUPABASE_DB_PASSWORD

  if (!projectRef) {
    throw new Error('Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!password && !process.env.SUPABASE_DB_URL) {
    throw new Error('Missing SUPABASE_DB_PASSWORD or SUPABASE_DB_URL')
  }

  const connectionString =
    process.env.SUPABASE_DB_URL ||
    `postgresql://postgres:${encodeURIComponent(password!)}@db.${projectRef}.supabase.co:5432/postgres`

  const sql = fs.readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    await client.query(sql)
  } finally {
    await client.end()
  }
}
