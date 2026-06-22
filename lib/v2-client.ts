// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Request gagal') as Error & { code?: string }
    if (data.code) err.code = data.code
    throw err
  }
  return data as T
}

export const v2Api = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async list<T = any>(table: string, params?: Record<string, string>): Promise<T[]> {
    const qs = params ? `?${new URLSearchParams(params)}` : ''
    return parseJson<T[]>(await fetch(`/api/v2/${table}${qs}`))
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create<T = any>(table: string, payload: Row): Promise<T> {
    return parseJson<T>(await fetch(`/api/v2/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update<T = any>(table: string, id: string, payload: Row): Promise<T> {
    return parseJson<T>(await fetch(`/api/v2/${table}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))
  },

  async remove(table: string, id: string): Promise<void> {
    await parseJson(await fetch(`/api/v2/${table}/${id}`, { method: 'DELETE' }))
  },

  async removeWhere(table: string, filters: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(filters)
    await parseJson(await fetch(`/api/v2/${table}?${qs}`, { method: 'DELETE' }))
  },
}
