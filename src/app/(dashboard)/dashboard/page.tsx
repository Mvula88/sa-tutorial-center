'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  UserPlus,
  Receipt,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react'
import type { DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/currency'
import { OnboardingChecklist } from '@/components/onboarding'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user?.center_id) return

      const supabase = createClient()

      try {
        // Fetch all stats in parallel
        const [
          studentsResult,
          teachersResult,
          subjectsResult,
          feesResult,
          paymentsResult,
        ] = await Promise.all([
          // Total and active students
          supabase
            .from('students')
            .select('id, status, gender', { count: 'exact' })
            .eq('center_id', user.center_id),

          // Total teachers
          supabase
            .from('teachers')
            .select('id', { count: 'exact' })
            .eq('center_id', user.center_id)
            .eq('status', 'active'),

          // Total subjects
          supabase
            .from('subjects')
            .select('id', { count: 'exact' })
            .eq('center_id', user.center_id)
            .eq('is_active', true),

          // Fees summary
          supabase
            .from('student_fees')
            .select('amount_due, amount_paid, status')
            .eq('center_id', user.center_id),

          // Recent payments
          supabase
            .from('payments')
            .select(`
              id,
              amount,
              payment_date,
              student:students(full_name)
            `)
            .eq('center_id', user.center_id)
            .order('payment_date', { ascending: false })
            .limit(5),
        ])

        // Calculate stats
        type StudentData = { id: string; status: string; gender: string | null }
        type FeeData = { amount_due: number; amount_paid: number; status: string }
        type PaymentData = { id: string; amount: number; payment_date: string; student: { full_name: string } | null }

        const students = (studentsResult.data || []) as StudentData[]
        const activeStudents = students.filter(s => s.status === 'active').length
        const maleStudents = students.filter(s => s.gender === 'male').length
        const femaleStudents = students.filter(s => s.gender === 'female').length
        const otherStudents = students.filter(s => s.gender === 'other').length

        const fees = (feesResult.data || []) as FeeData[]
        const totalFeesCollected = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0)
        const totalOutstanding = fees.reduce((sum, f) => sum + ((f.amount_due || 0) - (f.amount_paid || 0)), 0)
        const paidCount = fees.filter(f => f.status === 'paid').length
        const partialCount = fees.filter(f => f.status === 'partial').length
        const unpaidCount = fees.filter(f => f.status === 'unpaid').length

        const recentPayments = ((paymentsResult.data || []) as PaymentData[]).map(p => ({
          id: p.id,
          student_name: p.student?.full_name || 'Unknown',
          amount: p.amount,
          payment_date: p.payment_date,
        }))

        setStats({
          totalStudents: students.length,
          activeStudents,
          totalTeachers: teachersResult.count || 0,
          totalSubjects: subjectsResult.count || 0,
          totalFeesCollected,
          totalOutstanding,
          recentPayments,
          studentsByGender: {
            male: maleStudents,
            female: femaleStudents,
            other: otherStudents,
          },
          paymentStatusBreakdown: {
            paid: paidCount,
            partial: partialCount,
            unpaid: unpaidCount,
          },
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [user?.center_id])

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentDate = new Date()
  const greeting = currentDate.getHours() < 12 ? 'Good morning' : currentDate.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {greeting}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/students/new">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </Link>
          <Link href="/dashboard/payments/new">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Receipt className="w-4 h-4" />
              Record Payment
            </button>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist - shown for new users */}
      <OnboardingChecklist />

      {/* Quick Stats */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalStudents || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats?.activeStudents || 0} active
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <Link href="/dashboard/students" className="mt-4 flex items-center text-sm text-blue-600 font-medium hover:text-blue-700">
            View all students <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Teachers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalTeachers || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Teaching staff</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <Link href="/dashboard/teachers" className="mt-4 flex items-center text-sm text-green-600 font-medium hover:text-green-700">
            View all teachers <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Fees Collected</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats?.totalFeesCollected || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Total collected</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <Link href="/dashboard/payments" className="mt-4 flex items-center text-sm text-emerald-600 font-medium hover:text-emerald-700">
            View payments <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Subjects</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalSubjects || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Active subjects</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <Link href="/dashboard/subjects" className="mt-4 flex items-center text-sm text-purple-600 font-medium hover:text-purple-700">
            Manage subjects <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Outstanding Alert */}
      {(stats?.totalOutstanding || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Outstanding Fees</p>
              <p className="text-sm text-amber-700">
                You have {formatCurrency(stats?.totalOutstanding || 0)} in outstanding fees from students.
              </p>
            </div>
          </div>
          <Link href="/dashboard/payments/outstanding">
            <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap">
              View Details <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/students/new" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900">Add Student</h3>
              <p className="text-xs text-gray-500 mt-1">Register a new student</p>
            </div>
          </Link>

          <Link href="/dashboard/payments/new" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900">Record Payment</h3>
              <p className="text-xs text-gray-500 mt-1">Process fee payment</p>
            </div>
          </Link>

          <Link href="/dashboard/reports" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900">View Reports</h3>
              <p className="text-xs text-gray-500 mt-1">Analytics & insights</p>
            </div>
          </Link>

          <Link href="/dashboard/settings" className="group">
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-xs text-gray-500 mt-1">Configure your center</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            <Link href="/dashboard/payments" className="text-sm text-blue-600 font-medium hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.student_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(payment.payment_date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent payments</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Student Demographics */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Demographics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-600">Male</span>
                  <span className="text-sm font-semibold text-gray-900">{stats?.studentsByGender.male || 0}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats?.totalStudents ? (stats.studentsByGender.male / stats.totalStudents) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-600">Female</span>
                  <span className="text-sm font-semibold text-gray-900">{stats?.studentsByGender.female || 0}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats?.totalStudents ? (stats.studentsByGender.female / stats.totalStudents) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-600">Other</span>
                  <span className="text-sm font-semibold text-gray-900">{stats?.studentsByGender.other || 0}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats?.totalStudents ? (stats.studentsByGender.other / stats.totalStudents) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Status Overview</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats?.paymentStatusBreakdown.paid || 0}</p>
                <p className="text-xs font-medium text-green-700 mt-1">Paid</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats?.paymentStatusBreakdown.partial || 0}</p>
                <p className="text-xs font-medium text-amber-700 mt-1">Partial</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{stats?.paymentStatusBreakdown.unpaid || 0}</p>
                <p className="text-xs font-medium text-red-700 mt-1">Unpaid</p>
              </div>
            </div>
            <Link href="/dashboard/payments/outstanding" className="mt-4 flex items-center justify-center text-sm text-blue-600 font-medium hover:text-blue-700">
              View outstanding fees <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
