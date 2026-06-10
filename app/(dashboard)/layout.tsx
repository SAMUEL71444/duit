import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen w-screen bg-gray-950 overflow-hidden">
      <Sidebar userEmail={user.email} userName={user.user_metadata?.full_name} />

      {/* Main content — full remaining width */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile: spacer for hamburger */}
        <div className="lg:hidden h-14" />
        {/* Content area — full width with responsive padding */}
        <div className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
