import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// DCA Reminder — dipanggil oleh Supabase Edge Function cron
// Endpoint ini mengirim email reminder H-1 sebelum jadwal DCA

export async function POST(request: NextRequest) {
  try {
    // Verifikasi secret key dari cron job
    const authHeader = request.headers.get('Authorization')
    const expectedKey = process.env.CRON_SECRET_KEY

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || resendKey === 're_xxx') {
      return NextResponse.json({ message: 'Resend API key belum dikonfigurasi', count: 0 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)

    const supabase = await createClient()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDay = tomorrow.getDate()

    // Cari semua DCA schedule yang aktif dengan hari = besok
    const { data: schedules, error } = await supabase
      .from('dca_schedules')
      .select(`
        *,
        user_settings!inner(notification_email)
      `)
      .eq('is_active', true)
      .eq('day_of_month', tomorrowDay)

    if (error) {
      throw error
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'Tidak ada DCA H-1 hari ini', count: 0 })
    }

    let emailsSent = 0

    for (const schedule of schedules) {
      const notifEmail = (schedule as any).user_settings?.notification_email
      if (!notifEmail) continue

      try {
        await resend.emails.send({
          from: 'Wealth Command Center <noreply@resend.dev>',
          to: notifEmail,
          subject: `🔔 Reminder DCA ${schedule.ticker} Besok`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1D9E75;">📅 Reminder DCA Besok</h2>
              <p>Jangan lupa jadwal DCA kamu besok, <strong>${tomorrow.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>!</p>
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Saham/Aset:</strong> ${schedule.ticker}</p>
                <p style="margin: 8px 0 0;"><strong>Budget:</strong> Rp ${new Intl.NumberFormat('id-ID').format(schedule.budget)}</p>
              </div>
              <p style="color: #666; font-size: 14px;">Buka dashboard untuk menandai sebagai selesai setelah eksekusi.</p>
              <p style="margin-top: 24px; font-size: 12px; color: #999;">Dikirim otomatis oleh Personal Wealth Command Center</p>
            </div>
          `,
        })
        emailsSent++
      } catch (emailError) {
        console.error(`Gagal kirim email ke ${notifEmail}:`, emailError)
      }
    }

    return NextResponse.json({
      message: `Berhasil kirim ${emailsSent} reminder`,
      count: emailsSent,
    })
  } catch (error) {
    console.error('DCA reminder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

