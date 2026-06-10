const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const TIMEOUT_MS = 5000

export interface StockQuote {
  ticker: string
  price: number | null
  currency: string
  error?: string
}

export async function fetchStockPrice(ticker: string): Promise<StockQuote> {
  const symbol = ticker.includes('.') ? ticker : `${ticker}.JK`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=1d`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    const meta = result?.meta

    if (!meta?.regularMarketPrice) {
      throw new Error('Data harga tidak tersedia')
    }

    return {
      ticker,
      price: meta.regularMarketPrice,
      currency: meta.currency || 'IDR',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      ticker,
      price: null,
      currency: 'IDR',
      error: message,
    }
  }
}

export async function fetchMultipleStocks(
  tickers: string[]
): Promise<Record<string, StockQuote>> {
  const results = await Promise.allSettled(tickers.map(fetchStockPrice))
  const output: Record<string, StockQuote> = {}

  results.forEach((result, index) => {
    const ticker = tickers[index]
    if (result.status === 'fulfilled') {
      output[ticker] = result.value
    } else {
      output[ticker] = {
        ticker,
        price: null,
        currency: 'IDR',
        error: result.reason?.message || 'Gagal fetch',
      }
    }
  })

  return output
}
