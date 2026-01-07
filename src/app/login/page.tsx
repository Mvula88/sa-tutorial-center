'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, GraduationCap, CheckCircle } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setJustRegistered(true)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      // Check if user profile exists and is active
      type ProfileData = {
        is_active: boolean
        role: string
        center: { status: string } | null
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_active, role, center:tutorial_centers(status)')
        .eq('email', email)
        .single()

      const typedProfile = profile as ProfileData | null

      if (!typedProfile) {
        await supabase.auth.signOut()
        toast.error('User profile not found. Please contact administrator.')
        return
      }

      if (!typedProfile.is_active) {
        await supabase.auth.signOut()
        toast.error('Your account has been deactivated. Please contact administrator.')
        return
      }

      // Check center status for non-super admins
      if (typedProfile.role !== 'super_admin' && typedProfile.center) {
        if (typedProfile.center.status !== 'active') {
          await supabase.auth.signOut()
          toast.error('Your tutorial center account is inactive. Please contact support.')
          return
        }
      }

      toast.success('Login successful!')

      // Redirect based on role
      if (typedProfile.role === 'super_admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Logo/Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white mb-4">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white">School Management</h1>
        <p className="text-blue-100 mt-2 text-lg">Sign in to your account</p>
      </div>

      {/* Login Form */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        {/* Success message after registration */}
        {justRegistered && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Account created successfully!</p>
              <p className="text-sm text-green-700 mt-1">
                Your 14-day free trial has started. Sign in below to get started.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none pr-12"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="text-center mt-4">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
            Start free trial
          </Link>
        </p>
      </div>

      {/* Bottom text */}
      <p className="text-center text-xs text-white/70 mt-6">
        &copy; {new Date().getFullYear()} Digital Wave Technologies School Management System. All rights reserved.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* South African Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1580060839134-75a5edca2e99?q=80&w=2071&auto=format&fit=crop')`,
        }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-amber-900/50" />

      <Suspense fallback={
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-white">School Management</h1>
            <p className="text-blue-100 mt-2 text-lg">Loading...</p>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
