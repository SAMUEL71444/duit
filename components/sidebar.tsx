'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials, stringToColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  TrendingUp, Wallet, CreditCard, Users, Calculator,
  Clock, FileText, BarChart2, Flame, ArrowUpDown,
  Receipt, PieChart, CalendarDays, Shield, Target,
  RefreshCw, BookOpen, Code2, Radar, Settings,
  LogOut, ChevronLeft, Menu, Zap, X,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Keuangan',
    items: [
      { href: '/revenue', label: 'Revenue Pulse', icon: TrendingUp },
      { href: '/budget', label: 'Zero-Based Budget', icon: Wallet },
      { href: '/subscriptions', label: 'Subscription Audit', icon: CreditCard },
    ],
  },
  {
    label: 'Freelance',
    items: [
      { href: '/crm', label: 'Freelance CRM', icon: Users },
      { href: '/rate-calculator', label: 'Rate Calculator', icon: Calculator },
      { href: '/profitability', label: 'Project Profit', icon: Clock },
      { href: '/proposal', label: 'Proposal Generator', icon: FileText },
    ],
  },
  {
    label: 'Investasi',
    items: [
      { href: '/portfolio', label: 'Portfolio', icon: BarChart2 },
      { href: '/fire', label: 'FIRE Calculator', icon: Flame },
      { href: '/real-return', label: 'Real Return', icon: ArrowUpDown },
      { href: '/tax', label: 'Tax Investasi', icon: Receipt },
      { href: '/dca', label: 'DCA Scheduler', icon: CalendarDays },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/okr', label: 'OKR Tracker', icon: Target },
      { href: '/weekly-review', label: 'Weekly Review', icon: RefreshCw },
      { href: '/prompt-vault', label: 'Prompt Vault', icon: BookOpen },
      { href: '/radar', label: 'Zero-Day Radar', icon: Radar },
      { href: '/security', label: 'Security Advisor', icon: Shield },
    ],
  },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = userName || userEmail?.split('@')[0] || 'User'
  const initials = getInitials(displayName)
  const avatarColor = userEmail ? stringToColor(userEmail) : '#1D9E75'

  function NavContent() {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-5 border-b border-gray-800/80',
          'h-14 shrink-0',
          collapsed && 'justify-center px-0'
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/40">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white leading-tight tracking-tight">Wealth</p>
              <p className="text-[10px] text-emerald-400 font-semibold leading-tight uppercase tracking-widest">Command Center</p>
            </div>
          )}
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto p-1 text-gray-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
                        collapsed
                          ? 'w-10 h-10 justify-center mx-auto'
                          : 'px-3 py-2.5',
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          'shrink-0 transition-colors',
                          isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-white'
                        )}
                      />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {/* Active indicator bar */}
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-800/80 px-3 py-3 space-y-0.5 shrink-0">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'group flex items-center gap-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors',
              collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-3 py-2.5',
              pathname === '/settings' && 'bg-emerald-500/10 text-emerald-400'
            )}
          >
            <Settings size={16} className="shrink-0 text-gray-500 group-hover:text-white" />
            {!collapsed && 'Pengaturan'}
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              'w-full group flex items-center gap-3 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors',
              collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-3 py-2.5'
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && (loggingOut ? 'Keluar...' : 'Keluar')}
          </button>

          {/* User avatar */}
          {!collapsed && userEmail && (
            <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg bg-gray-900/60 border border-gray-800/60">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white font-semibold truncate">{displayName}</p>
                <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-8 border-t border-gray-800/80 text-gray-600 hover:text-white hover:bg-gray-800/40 transition-colors"
        >
          <ChevronLeft
            size={14}
            className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
          />
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ─── Desktop sidebar ─── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen border-r border-gray-800/80 transition-all duration-300 shrink-0 overflow-hidden',
          collapsed ? 'w-[60px]' : 'w-[220px]'
        )}
      >
        <NavContent />
      </aside>

      {/* ─── Mobile: top bar ─── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-950/95 border-b border-gray-800/80 backdrop-blur-sm flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white">Wealth Command Center</span>
        </div>
      </div>

      {/* ─── Mobile: overlay drawer ─── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[240px] flex flex-col border-r border-gray-800 shadow-2xl">
            <NavContent />
          </aside>
        </>
      )}
    </>
  )
}
