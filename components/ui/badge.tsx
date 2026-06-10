'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
    danger: 'bg-red-900/50 text-red-400 border border-red-800',
    warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
    info: 'bg-blue-900/50 text-blue-400 border border-blue-800',
    outline: 'bg-transparent border border-gray-600 text-gray-300',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

// Badge khusus untuk CVSS severity
export function SeverityBadge({ score }: { score: number }) {
  if (score >= 9.0)
    return <Badge variant="danger">Critical ({score})</Badge>
  if (score >= 7.0)
    return <Badge variant="danger" className="bg-orange-900/50 text-orange-400 border-orange-800">High ({score})</Badge>
  if (score >= 4.0)
    return <Badge variant="warning">Medium ({score})</Badge>
  return <Badge variant="info">Low ({score})</Badge>
}

// Badge untuk stage CRM
export function StageBadge({ stage }: { stage: string }) {
  const stageVariants: Record<string, BadgeProps['variant']> = {
    Lead: 'info',
    Negosiasi: 'warning',
    Aktif: 'success',
    Selesai: 'default',
    'Tidak Jadi': 'danger',
  }

  return <Badge variant={stageVariants[stage] || 'default'}>{stage}</Badge>
}
