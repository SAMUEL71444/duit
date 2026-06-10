/**
 * Apply all v2 table migrations to Supabase.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=your-db-password node scripts/apply-migration.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.join(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    const key = line.slice(0, i)
    const value = line.slice(i + 1)
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const password = process.env.SUPABASE_DB_PASSWORD

if (!projectRef) {
  console.error('Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL.')
  process.exit(1)
}

if (!password && !process.env.SUPABASE_DB_URL) {
  console.error('Missing SUPABASE_DB_PASSWORD or SUPABASE_DB_URL.')
  console.error('Get password from: https://supabase.com/dashboard/project/' + projectRef + '/settings/database')
  process.exit(1)
}

const connectionString =
  process.env.SUPABASE_DB_URL ||
  `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20250608_all_v2_tables.sql'),
  'utf8'
)

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  console.log('OK: all v2 tables created and schema cache reload notified.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
