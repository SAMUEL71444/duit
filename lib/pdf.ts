'use client'

export interface PDFOptions {
  filename?: string
  margin?: number
  scale?: number
}

type ImageType = 'jpeg' | 'png' | 'webp'

export async function exportToPDF(
  elementId: string,
  options: PDFOptions = {}
): Promise<void> {
  const { filename = 'export', margin = 10, scale = 2 } = options

  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element dengan id "${elementId}" tidak ditemukan`)
  }

  // Dynamic import — html2pdf.js hanya berjalan di browser
  const html2pdf = (await import('html2pdf.js')).default

  const opt = {
    margin,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as ImageType, quality: 0.98 },
    html2canvas: {
      scale,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4',
      orientation: 'portrait' as const,
    },
  }

  await html2pdf().set(opt).from(element).save()
}

export async function exportToPDFLandscape(
  elementId: string,
  options: PDFOptions = {}
): Promise<void> {
  const { filename = 'export', margin = 10, scale = 2 } = options

  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element dengan id "${elementId}\" tidak ditemukan`)
  }

  const html2pdf = (await import('html2pdf.js')).default

  const opt = {
    margin,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as ImageType, quality: 0.98 },
    html2canvas: {
      scale,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4',
      orientation: 'landscape' as const,
    },
  }

  await html2pdf().set(opt).from(element).save()
}
