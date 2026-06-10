import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Personal Wealth Command Center',
    template: '%s | Wealth Command Center',
  },
  description:
    'Dashboard keuangan pribadi untuk solo freelancer, developer, dan security researcher Indonesia. Tracking income, investasi, freelance pipeline, dan AI tools dalam satu tempat.',
  keywords: [
    'dashboard keuangan',
    'freelancer indonesia',
    'investasi saham',
    'FIRE calculator',
    'manajemen keuangan pribadi',
  ],
  authors: [{ name: 'Personal Wealth Command Center' }],
  robots: 'noindex, nofollow', // Private dashboard — tidak perlu di-index
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="dark" style={{ width: '100%', height: '100%' }}>
      <body className={`${inter.variable} font-sans bg-gray-950 text-gray-100 antialiased w-full h-full overflow-hidden`}>
        {children}
      </body>
    </html>
  )
}
