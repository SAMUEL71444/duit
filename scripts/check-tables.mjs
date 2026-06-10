import fs from 'node:fs'

function loadEnvLocal() {
  if (!fs.existsSync('.env.local')) return
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    const key = line.slice(0, i)
    const value = line.slice(i + 1)
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const tables = [
  'proposals', 'portfolio_holdings', 'subscriptions', 'dca_executions',
  'okrs', 'key_results', 'weekly_reviews', 'prompts',
]

const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

console.log('Supabase project:', projectRef)
console.log('URL:', url)
console.log('')

let missing = 0
for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const body = await res.text()
  const ok = res.status === 200
  if (!ok) missing++
  console.log(`${ok ? 'OK  ' : 'MISS'}  ${table}${ok ? '' : ` — ${body.slice(0, 80)}`}`)
}

console.log('')
if (missing > 0) {
  console.log(`${missing} tabel belum ada.`)
  console.log(`Jalankan SQL di: https://supabase.com/dashboard/project/${projectRef}/sql/new`)
  console.log('File: supabase/migrations/20250608_all_v2_tables.sql')
  process.exit(1)
}

console.log('Semua tabel v2 sudah ada.')
