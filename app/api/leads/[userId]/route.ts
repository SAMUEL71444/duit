import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, project_type, budget, message, source_url } = body

    if (!name) {
      return NextResponse.json({ error: 'Field name wajib diisi' }, { status: 400 })
    }

    // Simpan lead ke database
    const { data: lead, error: dbError } = await supabase
      .from('leads')
      .insert({
        user_id: userId,
        name,
        email: email || null,
        project_type: project_type || null,
        budget: budget || null,
        message: message || null,
        source_url: source_url || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json({ error: 'Gagal menyimpan lead' }, { status: 500 })
    }

    // Ambil notification email dari settings user
    const { data: settings } = await supabase
      .from('user_settings')
      .select('notification_email')
      .eq('user_id', userId)
      .single()

    const notifEmail = settings?.notification_email

    // Kirim email notifikasi ke pemilik dashboard
    if (notifEmail && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'Wealth Command Center <noreply@resend.dev>',
          to: notifEmail,
          subject: `Lead baru dari ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1D9E75;">Lead Baru Masuk 🎯</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; width: 140px;">Nama</td><td style="padding: 8px 0; font-weight: bold;">${name}</td></tr>
                ${email ? `<tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${email}</td></tr>` : ''}
                ${project_type ? `<tr><td style="padding: 8px 0; color: #666;">Jenis Project</td><td style="padding: 8px 0;">${project_type}</td></tr>` : ''}
                ${budget ? `<tr><td style="padding: 8px 0; color: #666;">Budget</td><td style="padding: 8px 0;">${budget}</td></tr>` : ''}
                ${source_url ? `<tr><td style="padding: 8px 0; color: #666;">Sumber</td><td style="padding: 8px 0;">${source_url}</td></tr>` : ''}
              </table>
              ${message ? `<div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;"><strong>Pesan:</strong><p style="margin: 8px 0 0;">${message}</p></div>` : ''}
              <p style="margin-top: 24px; font-size: 12px; color: #999;">Dikirim otomatis oleh Personal Wealth Command Center</p>
            </div>
          `,
        })
      } catch (emailError) {
        // Log error tapi jangan gagalkan response
        console.error('Email error:', emailError)
      }
    }

    return NextResponse.json(
      { success: true, lead_id: lead.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Lead webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// CORS headers untuk cross-origin form submissions
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
