'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import type { DashboardStats } from '@/types'
import { formatCurrency } from '@/lib/currency'
import { OnboardingChecklist } from '@/components/onboarding'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down'
  trendValue?: string
  color: string
}

function StatCard({ title, value, icon, trend, trendValue, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

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


  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm md:text-base">Welcome back, {user?.full_name}</p>
      </div>

      {/* Onboarding Checklist - shown for new users */}
      <div className="mb-6 md:mb-8">
        <OnboardingChecklist />
      </div>

      {/* Stats Grid */}
      <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={<GraduationCap className="w-6 h-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Active Teachers"
          value={stats?.totalTeachers || 0}
          icon={<Users className="w-6 h-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Subjects Offered"
          value={stats?.totalSubjects || 0}
          icon={<BookOpen className="w-6 h-6 text-purple-600" />}
          color="bg-purple-100"
        />
        <StatCard
          title="Fees Collected"
          value={formatCurrency(stats?.totalFeesCollected || 0)}
          icon={<CreditCard className="w-6 h-6 text-emerald-600" />}
          color="bg-emerald-100"
        />
      </div>

      {/* Outstanding Alert */}
      {(stats?.totalOutstanding || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 md:mb-8 flex items-start sm:items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Outstanding Fees</p>
            <p className="text-sm text-amber-700">
              You have {formatCurrency(stats?.totalOutstanding || 0)} in outstanding fees from students.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
          {stats?.recentPayments && stats.recentPayments.length > 0 ? (
            <div className="space-y-3">
              {stats.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{payment.student_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent payments</p>
          )}
        </div>

        {/* Students by Gender */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Students by Gender</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Male</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.studentsByGender.male || 0}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{
                    width: `${stats?.totalStudents ? (stats.studentsByGender.male / stats.totalStudents) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Female</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.studentsByGender.female || 0}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-pink-500 h-2.5 rounded-full"
                  style={{
                    width: `${stats?.totalStudents ? (stats.studentsByGender.female / stats.totalStudents) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Other</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.studentsByGender.other || 0}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-purple-500 h-2.5 rounded-full"
                  style={{
                    width: `${stats?.totalStudents ? (stats.studentsByGender.other / stats.totalStudents) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <h3 className="text-md font-semibold text-gray-900 mt-8 mb-4">Payment Status</h3>
          <div className="flex gap-4">
            <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats?.paymentStatusBreakdown.paid || 0}
              </p>
              <p className="text-xs text-green-700">Paid</p>
            </div>
            <div className="flex-1 bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {stats?.paymentStatusBreakdown.partial || 0}
              </p>
              <p className="text-xs text-amber-700">Partial</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {stats?.paymentStatusBreakdown.unpaid || 0}
              </p>
              <p className="text-xs text-red-700">Unpaid</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
