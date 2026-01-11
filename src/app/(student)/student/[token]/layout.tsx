'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Home,
  Calendar,
  FileText,
  CreditCard,
  ClipboardCheck,
  GraduationCap,
  LogOut,
} from 'lucide-react'

interface StudentData {
  id: string
  full_name: string
  student_number: string | null
  grade: string | null
  class_id: string | null
  center_id: string
  center?: {
    name: string
    logo_url: string | null
    primary_color: string | null
  }
  class?: {
    name: string
  }
}

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const token = params.token as string
  const [student, setStudent] = useState<StudentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      validateAccess()
    }
  }, [token])

  async function validateAccess() {
    setIsLoading(true)
    const supabase = createClient()

    // Token is the student ID for now (could be enhanced with signed tokens)
    const { data, error } = await supabase
      .from('students')
      .select(`
        id, full_name, student_number, grade, class_id, center_id,
        center:tutorial_centers(name, logo_url, primary_color),
        class:classes(name)
      `)
      .eq('id', token)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      setError('Invalid or expired access link')
      setIsLoading(false)
      return
    }

    setStudent(data as unknown as StudentData)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500">{error || 'This link is invalid or has expired.'}</p>
        </div>
      </div>
    )
  }

  const primaryColor = student.center?.primary_color || '#1E40AF'

  const navItems = [
    { label: 'Overview', href: `/student/${token}`, icon: <Home className="w-5 h-5" /> },
    { label: 'Timetable', href: `/student/${token}/timetable`, icon: <Calendar className="w-5 h-5" /> },
    { label: 'Report Cards', href: `/student/${token}/report-cards`, icon: <FileText className="w-5 h-5" /> },
    { label: 'Attendance', href: `/student/${token}/attendance`, icon: <ClipboardCheck className="w-5 h-5" /> },
    { label: 'Fees', href: `/student/${token}/fees`, icon: <CreditCard className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {student.center?.logo_url ? (
                <img
                  src={student.center.logo_url}
                  alt={student.center.name}
                  className="w-10 h-10 rounded-lg object-contain bg-gray-100 p-1"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {student.center?.name?.charAt(0) || 'S'}
                </div>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">{student.center?.name}</h1>
                <p className="text-sm text-gray-500">Student Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium text-gray-900">{student.full_name}</p>
                <p className="text-sm text-gray-500">
                  {student.class?.name || student.grade || 'Student'}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {student.full_name.charAt(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Powered by {student.center?.name} Management System</p>
        </div>
      </footer>
    </div>
  )
}
