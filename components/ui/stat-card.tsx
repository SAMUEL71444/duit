'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: number // persentase perubahan, positif/negatif
  trendLabel?: string
  icon?: React.ReactNode
  highlight?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  highlight = false,
  className,
}: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== null

  const trendColor =
    trend === 0
      ? 'text-gray-400'
      : trend !== undefined && trend > 0
      ? 'text-emerald-400'
      : 'text-red-400'

  const TrendIcon =
    trend === 0 ? Minus : trend !== undefined && trend > 0 ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        'relative rounded-xl border p-5 overflow-hidden transition-all duration-200',
        highlight
          ? 'border-emerald-800 bg-emerald-950/30'
          : 'border-gray-800 bg-gray-900',
        'hover:border-gray-700',
        className
      )}
    >
      {/* Gradient accent */}
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-400 font-medium truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-white tracking-tight truncate">
            {value}
          </p>

          {hasTrend && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm', trendColor)}>
              <TrendIcon size={14} />
              <span className="font-medium">
                {trend > 0 ? '+' : ''}{trend?.toFixed(1)}%
              </span>
              {trendLabel && (
                <span className="text-gray-500 text-xs">{trendLabel}</span>
              )}
            </div>
          )}

          {subtitle && !hasTrend && (
            <p className="mt-1.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div className="p-2.5 rounded-lg bg-gray-800 text-gray-400 shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
