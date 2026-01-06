'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Download,
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'

interface PlatformStats {
  totalCenters: number
  activeCenters: number
  suspendedCenters: number
  totalUsers: number
  totalStudents: number
  totalTeachers: number
  totalRevenue: number
  centersBySubscription: {
    basic: number
    premium: number
    enterprise: number
  }
  topCenters: {
    id: string
    name: string
    students: number
    revenue: number
  }[]
  moduleUsage: {
    hostel: number
    transport: number
    library: number
    sms: number
  }
}

export default function AdminReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [dateRange, setDateRange] = useState('all_time')

  useEffect(() => {
    fetchPlatformStats()
  }, [dateRange])

  async function fetchPlatformStats() {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch centers
      interface CenterRow {
        id: string
        name: string
        status: string
        subscription_tier: string | null
        hostel_module_enabled: boolean
        transport_module_enabled: boolean
        library_module_enabled: boolean
        sms_module_enabled: boolean
      }
      const { data: centersData } = await supabase
        .from('tutorial_centers')
        .select('id, name, status, subscription_tier, hostel_module_enabled, transport_module_enabled, library_module_enabled, sms_module_enabled')
      const centers = (centersData || []) as CenterRow[]

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('id', { count: 'exact' })

      // Fetch students count
      const { count: studentsCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })

      // Fetch teachers count
      const { count: teachersCount } = await supabase
        .from('teachers')
        .select('id', { count: 'exact' })

      // Fetch total payments
      interface PaymentRow { amount: number; center_id: string }
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, center_id')
      const payments = (paymentsData || []) as PaymentRow[]

      // Calculate stats
      const activeCenters = centers.filter(c => c.status === 'active').length
      const suspendedCenters = centers.filter(c => c.status === 'suspended').length

      const centersBySubscription = {
        basic: centers.filter(c => c.subscription_tier === 'basic').length,
        premium: centers.filter(c => c.subscription_tier === 'premium').length,
        enterprise: centers.filter(c => c.subscription_tier === 'enterprise').length,
      }

      const moduleUsage = {
        hostel: centers.filter(c => c.hostel_module_enabled).length,
        transport: centers.filter(c => c.transport_module_enabled).length,
        library: centers.filter(c => c.library_module_enabled).length,
        sms: centers.filter(c => c.sms_module_enabled).length,
      }

      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

      // Get top centers by revenue
      const revenueByCenter: Record<string, number> = {}
      payments.forEach(p => {
        revenueByCenter[p.center_id] = (revenueByCenter[p.center_id] || 0) + p.amount
      })

      // Get student counts per center
      interface StudentCount { center_id: string }
      const { data: studentCountsData } = await supabase
        .from('students')
        .select('center_id')
      const studentCounts = (studentCountsData || []) as StudentCount[]

      const studentsByCenter: Record<string, number> = {}
      studentCounts.forEach(s => {
        studentsByCenter[s.center_id] = (studentsByCenter[s.center_id] || 0) + 1
      })

      const topCenters = centers
        ?.map(c => ({
          id: c.id,
          name: c.name,
          students: studentsByCenter[c.id] || 0,
          revenue: revenueByCenter[c.id] || 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5) || []

      setStats({
        totalCenters: centers?.length || 0,
        activeCenters,
        suspendedCenters,
        totalUsers: usersCount || 0,
        totalStudents: studentsCount || 0,
        totalTeachers: teachersCount || 0,
        totalRevenue,
        centersBySubscription,
        topCenters,
        moduleUsage,
      })
    } catch (error) {
      console.error('Error fetching platform stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NA', {
      style: 'currency',
      currency: 'NAD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
          <p className="text-gray-500 mt-1">Platform-wide analytics and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: 'this_month', label: 'This Month' },
              { value: 'last_month', label: 'Last Month' },
              { value: 'this_year', label: 'This Year' },
              { value: 'all_time', label: 'All Time' },
            ]}
            className="w-40"
          />
          <Button leftIcon={<Download className="w-4 h-4" />} variant="secondary">
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-green-600">{stats?.activeCenters} active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalCenters}</p>
          <p className="text-sm text-gray-500">Total Centers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents}</p>
          <p className="text-sm text-gray-500">Total Students</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Subscription Tiers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Subscription Tiers</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Basic', value: stats?.centersBySubscription.basic || 0, color: 'bg-gray-500' },
              { label: 'Premium', value: stats?.centersBySubscription.premium || 0, color: 'bg-blue-500' },
              { label: 'Enterprise', value: stats?.centersBySubscription.enterprise || 0, color: 'bg-purple-500' },
            ].map((tier) => (
              <div key={tier.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{tier.label}</span>
                  <span className="text-sm font-medium">{tier.value} centers</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tier.color} rounded-full`}
                    style={{ width: `${(tier.value / (stats?.totalCenters || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Module Adoption</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Hostel', value: stats?.moduleUsage.hostel || 0, color: 'bg-green-100 text-green-700' },
              { label: 'Transport', value: stats?.moduleUsage.transport || 0, color: 'bg-blue-100 text-blue-700' },
              { label: 'Library', value: stats?.moduleUsage.library || 0, color: 'bg-purple-100 text-purple-700' },
              { label: 'SMS', value: stats?.moduleUsage.sms || 0, color: 'bg-amber-100 text-amber-700' },
            ].map((module) => (
              <div key={module.label} className={`p-4 rounded-lg ${module.color}`}>
                <p className="text-2xl font-bold">{module.value}</p>
                <p className="text-sm">{module.label} enabled</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Centers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Top Performing Centers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left">
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-sm font-medium text-gray-500">Rank</th>
                <th className="pb-3 text-sm font-medium text-gray-500">Center</th>
                <th className="pb-3 text-sm font-medium text-gray-500 text-right">Students</th>
                <th className="pb-3 text-sm font-medium text-gray-500 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topCenters.map((center, index) => (
                <tr key={center.id} className="border-b border-gray-50">
                  <td className="py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 font-medium text-gray-900">{center.name}</td>
                  <td className="py-3 text-right text-gray-600">{center.students}</td>
                  <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(center.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Generate Reports</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Centers Overview', description: 'All centers with status and details', icon: <Building2 className="w-5 h-5" /> },
            { title: 'Platform Revenue', description: 'Revenue breakdown by center', icon: <DollarSign className="w-5 h-5" /> },
            { title: 'User Activity', description: 'User logins and activity log', icon: <Users className="w-5 h-5" /> },
            { title: 'Student Statistics', description: 'Student enrollment across centers', icon: <GraduationCap className="w-5 h-5" /> },
            { title: 'Module Usage', description: 'Module adoption analytics', icon: <Activity className="w-5 h-5" /> },
            { title: 'Monthly Summary', description: 'Platform performance summary', icon: <Calendar className="w-5 h-5" /> },
          ].map((report) => (
            <div
              key={report.title}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{report.title}</p>
                  <p className="text-sm text-gray-500">{report.description}</p>
                </div>
                <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
