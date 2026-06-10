'use client'

import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ErrorBannerProps {
  type?: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  dismissible?: boolean
  className?: string
  lastFetched?: string
}

export function ErrorBanner({
  type = 'error',
  title,
  message,
  dismissible = false,
  className,
  lastFetched,
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const styles = {
    error: {
      container: 'bg-red-950/40 border-red-800 text-red-300',
      icon: <AlertTriangle size={16} className="text-red-400 shrink-0" />,
    },
    warning: {
      container: 'bg-yellow-950/40 border-yellow-800 text-yellow-300',
      icon: <AlertTriangle size={16} className="text-yellow-400 shrink-0" />,
    },
    info: {
      container: 'bg-blue-950/40 border-blue-800 text-blue-300',
      icon: <Info size={16} className="text-blue-400 shrink-0" />,
    },
    success: {
      container: 'bg-emerald-950/40 border-emerald-800 text-emerald-300',
      icon: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    },
  }

  const { container, icon } = styles[type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border text-sm',
        container,
        className
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="opacity-90">{message}</p>
        {lastFetched && (
          <p className="text-xs opacity-60 mt-1">Terakhir berhasil: {lastFetched}</p>
        )}
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
