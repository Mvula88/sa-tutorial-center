'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { AdminSidebar } from '@/components/layout/sidebar'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, isInitialized, isSuperAdmin } = useAuthStore()

  useEffect(() => {
    // Only redirect after auth state is fully initialized
    if (isInitialized && !isAuthenticated) {
      router.push('/login')
    }
    // Redirect non-super admins to dashboard
    if (isInitialized && isAuthenticated && !isSuperAdmin()) {
      router.push('/dashboard')
    }
  }, [isInitialized, isAuthenticated, isSuperAdmin, router])

  // Show loading only while not initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Not authenticated or not super admin - will redirect via useEffect
  if (!isAuthenticated || user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 px-6 text-center text-xs text-gray-500 border-t border-gray-200 bg-white">
          2026 &copy; designed by Digital Wave Technologies | 081 321 4813 | 081 440 1522
        </footer>
      </main>
    </div>
  )
}
