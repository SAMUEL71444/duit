import { GoogleGenerativeAI } from '@google/generative-ai'

// PENTING: file ini HANYA untuk server-side (API routes)
// Jangan import di komponen client-side

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('GOOGLE_GENERATIVE_AI_API_KEY tidak ditemukan di environment variables')
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)

export interface GeminiOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  options: GeminiOptions = {}
): Promise<string> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxOutputTokens = 8192,
  } = options

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  })

  const result = await geminiModel.generateContent(prompt)
  const response = result.response
  return response.text()
}

export async function generateJSON<T = unknown>(
  prompt: string,
  systemInstruction?: string,
  options: GeminiOptions = {}
): Promise<T> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.3,
    maxOutputTokens = 8192,
  } = options

  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
    },
  })

  const result = await geminiModel.generateContent(prompt)
  const text = result.response.text()

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Gagal parse JSON dari Gemini: ${text.slice(0, 200)}`)
  }
}
