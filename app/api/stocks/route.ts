import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Server-side proxy untuk Yahoo Finance — bypass CORS dari browser
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tickers = searchParams.get('tickers')
    if (!tickers) return NextResponse.json({ error: 'tickers wajib diisi' }, { status: 400 })

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
    if (tickerList.length === 0) return NextResponse.json({ error: 'Tidak ada ticker valid' }, { status: 400 })
    if (tickerList.length > 20) return NextResponse.json({ error: 'Maksimal 20 ticker sekaligus' }, { status: 400 })

    const results = await Promise.allSettled(
      tickerList.map(async (ticker) => {
        const symbol = ticker.includes('.') ? ticker : `${ticker}.JK`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }
        )
        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const meta = data?.chart?.result?.[0]?.meta
        if (!meta?.regularMarketPrice) throw new Error('Data tidak tersedia')

        return {
          ticker,
          symbol,
          price: meta.regularMarketPrice,
          previousClose: meta.chartPreviousClose || meta.previousClose || null,
          currency: meta.currency || 'IDR',
          exchange: meta.exchangeName || null,
        }
      })
    )

    const output: Record<string, {
      ticker: string
      price: number | null
      previousClose: number | null
      currency: string
      change: number | null
      changePct: number | null
      error?: string
    }> = {}

    results.forEach((result, i) => {
      const ticker = tickerList[i]
      if (result.status === 'fulfilled') {
        const v = result.value
        const change = v.previousClose ? v.price - v.previousClose : null
        const changePct = v.previousClose ? ((v.price - v.previousClose) / v.previousClose) * 100 : null
        output[ticker] = { ticker, price: v.price, previousClose: v.previousClose, currency: v.currency, change, changePct }
      } else {
        output[ticker] = { ticker, price: null, previousClose: null, currency: 'IDR', change: null, changePct: null, error: result.reason?.message || 'Gagal fetch' }
      }
    })

    return NextResponse.json(output, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
