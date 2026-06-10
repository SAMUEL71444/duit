'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Zap, Mail, Lock, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function validateForm(): string | null {
    if (!email || !password || !confirmPassword) {
      return 'Semua field harus diisi'
    }
    if (password.length < 8) {
      return 'Password minimal 8 karakter'
    }
    if (password !== confirmPassword) {
      return 'Password tidak cocok'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Format email tidak valid'
    }
    return null
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/revenue`,
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Email sudah terdaftar. Silakan login.')
        } else {
          setError(error.message)
        }
        return
      }

      // Kalau email confirmation disabled di Supabase → langsung redirect
      if (data.session) {
        router.push('/revenue')
        router.refresh()
        return
      }

      // Kalau email confirmation enabled → tampilkan pesan sukses
      setSuccess(true)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-900/50 border border-emerald-700 mb-4">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Cek Email Kamu</h2>
          <p className="text-gray-400 text-sm mb-6">
            Kami sudah kirim link konfirmasi ke <strong className="text-white">{email}</strong>.
            Klik link tersebut untuk mengaktifkan akun.
          </p>
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            ← Kembali ke halaman login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-gray-950 to-emerald-950/20 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Buat Akun</h1>
          <p className="text-sm text-gray-500 mt-1">Personal Wealth Command Center</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <ErrorBanner type="error" message={error} dismissible />
            )}

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              hint="Minimal 8 karakter"
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Konfirmasi Password"
              placeholder="Ulangi password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Password tidak cocok'
                  : undefined
              }
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={loading}
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
