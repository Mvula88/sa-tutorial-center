'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import Link from 'next/link'
import {
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from 'lucide-react'

interface PlatformStats {
  totalCenters: number
  activeCenters: number
  inactiveCenters: number
  suspendedCenters: number
  totalUsers: number
  totalStudentsAcrossPlatform: number
  centersWithHostel: number
  recentCenters: {
    id: string
    name: string
    status: string
    created_at: string
  }[]
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      try {
        // Fetch centers
        const { data: centers } = await supabase
          .from('tutorial_centers')
          .select('id, name, status, created_at, hostel_module_enabled')
          .order('created_at', { ascending: false })

        // Fetch users count
        const { count: usersCount } = await supabase
          .from('users')
          .select('id', { count: 'exact' })

        // Fetch total students
        const { count: studentsCount } = await supabase
          .from('students')
          .select('id', { count: 'exact' })

        type CenterData = {
          id: string
          name: string
          status: string
          created_at: string
          hostel_module_enabled: boolean
        }

        const allCenters = (centers || []) as CenterData[]
        const activeCenters = allCenters.filter(c => c.status === 'active').length
        const inactiveCenters = allCenters.filter(c => c.status === 'inactive').length
        const suspendedCenters = allCenters.filter(c => c.status === 'suspended').length
        const centersWithHostel = allCenters.filter(c => c.hostel_module_enabled).length

        setStats({
          totalCenters: allCenters.length,
          activeCenters,
          inactiveCenters,
          suspendedCenters,
          totalUsers: usersCount || 0,
          totalStudentsAcrossPlatform: studentsCount || 0,
          centersWithHostel,
          recentCenters: allCenters.slice(0, 5).map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            created_at: c.created_at,
          })),
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700',
    }
    return styles[status as keyof typeof styles] || styles.inactive
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and management</p>
        </div>
        <Link
          href="/admin/centers/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Center
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Centers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalCenters || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Centers</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats?.activeCenters || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalUsers || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalStudentsAcrossPlatform || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-100">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.suspendedCenters || 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Attention Required</p>
            <p className="text-sm text-red-700">
              {stats?.suspendedCenters} center(s) are currently suspended. Review their status.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Centers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Centers</h2>
            <Link href="/admin/centers" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {stats?.recentCenters && stats.recentCenters.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCenters.map((center) => (
                <Link
                  key={center.id}
                  href={`/admin/centers/${center.id}`}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(center.status)}
                    <div>
                      <p className="font-medium text-gray-900">{center.name}</p>
                      <p className="text-sm text-gray-500">
                        Created {new Date(center.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(center.status)}`}>
                    {center.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No centers yet</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Centers with Hostel Module</span>
              <span className="font-semibold text-gray-900">{stats?.centersWithHostel || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Inactive Centers</span>
              <span className="font-semibold text-amber-600">{stats?.inactiveCenters || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Suspended Centers</span>
              <span className="font-semibold text-red-600">{stats?.suspendedCenters || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600">Average Students per Center</span>
              <span className="font-semibold text-gray-900">
                {stats?.totalCenters ? Math.round((stats?.totalStudentsAcrossPlatform || 0) / stats.totalCenters) : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
