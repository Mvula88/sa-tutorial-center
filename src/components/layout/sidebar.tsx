'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  Building2,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Bus,
  Library,
} from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  module?: 'hostel' | 'transport' | 'library' | 'sms'
  adminOnly?: boolean // Only visible to center_admin, not center_staff
}

const centerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Students', href: '/dashboard/students', icon: <GraduationCap className="w-5 h-5" /> },
  { label: 'Teachers', href: '/dashboard/teachers', icon: <Users className="w-5 h-5" />, adminOnly: true },
  { label: 'Subjects', href: '/dashboard/subjects', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Payments', href: '/dashboard/payments', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Hostel', href: '/dashboard/hostel', icon: <Home className="w-5 h-5" />, module: 'hostel' },
  { label: 'Transport', href: '/dashboard/transport', icon: <Bus className="w-5 h-5" />, module: 'transport' },
  { label: 'Library', href: '/dashboard/library', icon: <Library className="w-5 h-5" />, module: 'library' },
  { label: 'Reports', href: '/dashboard/reports', icon: <FileText className="w-5 h-5" />, adminOnly: true },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" />, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, canAccessModule, isCenterAdmin } = useAuthStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Filter nav items based on role and module access
  const navItems = centerNavItems.filter(item => {
    // Hide admin-only items from staff
    if (item.adminOnly && !isCenterAdmin()) return false
    // Check module access
    if (item.module && !canAccessModule(item.module)) return false
    return true
  })

  // Get center branding
  const primaryColor = user?.center?.primary_color || '#1E40AF'
  const centerName = user?.center?.name || 'Tutorial Center'
  const logoUrl = user?.center?.logo_url

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo Area */}
      <div className="p-4 border-b border-gray-200">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            {logoUrl ? (
              logoUrl.includes('127.0.0.1') || logoUrl.includes('localhost') ? (
                <img
                  src={logoUrl}
                  alt={centerName}
                  width={40}
                  height={40}
                  className="rounded-lg bg-gray-100 p-1 object-contain w-10 h-10 flex-shrink-0"
                />
              ) : (
                <Image
                  src={logoUrl}
                  alt={centerName}
                  width={40}
                  height={40}
                  className="rounded-lg bg-gray-100 p-1 object-contain flex-shrink-0"
                />
              )
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {centerName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                {centerName}
              </h2>
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {logoUrl ? (
              logoUrl.includes('127.0.0.1') || logoUrl.includes('localhost') ? (
                <img
                  src={logoUrl}
                  alt={centerName}
                  width={36}
                  height={36}
                  className="rounded-lg bg-gray-100 p-1 object-contain w-9 h-9"
                />
              ) : (
                <Image
                  src={logoUrl}
                  alt={centerName}
                  width={36}
                  height={36}
                  className="rounded-lg bg-gray-100 p-1 object-contain"
                />
              )
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {centerName.charAt(0)}
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // For /dashboard, only match exactly. For other routes, match prefix.
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={isActive ? { backgroundColor: primaryColor } : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="mb-3 px-3">
            <p className="font-medium text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>

    </aside>
  )
}

// Super Admin Sidebar
const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Tutorial Centers', href: '/admin/centers', icon: <Building2 className="w-5 h-5" /> },
  { label: 'All Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Reports', href: '/admin/reports', icon: <FileText className="w-5 h-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuthStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={`h-screen bg-gray-900 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              TC
            </div>
            <span className="font-semibold text-white">Super Admin</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        {!isCollapsed && (
          <div className="mb-3 px-3">
            <p className="font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-sm text-gray-400 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-600/10 hover:text-red-400 transition-colors w-full"
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>

    </aside>
  )
}
