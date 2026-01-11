'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import { PLAN_LIMITS } from '@/lib/subscription-limits'
import {
  Users,
  Plus,
  Search,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Loader2,
  X,
  AlertTriangle,
  Crown,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface StaffMember {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

interface StaffLimitInfo {
  current: number
  limit: number
  tier: string
  canAdd: boolean
}

export default function StaffPage() {
  const { user, getSubscriptionTier } = useAuthStore()
  const subscriptionTier = getSubscriptionTier()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [staffLimit, setStaffLimit] = useState<StaffLimitInfo | null>(null)

  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Deactivate modal
  const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; staff: StaffMember | null }>({
    open: false,
    staff: null,
  })
  const [isDeactivating, setIsDeactivating] = useState(false)

  useEffect(() => {
    if (user?.center_id) {
      fetchStaff()
      fetchStaffLimit()
    }
  }, [user?.center_id])

  async function fetchStaff() {
    if (!user?.center_id) return
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('center_id', user.center_id)
      .eq('role', 'center_staff')
      .order('full_name')

    if (!error) {
      setStaff((data || []) as StaffMember[])
    }
    setIsLoading(false)
  }

  async function fetchStaffLimit() {
    if (!user?.center_id) return
    const supabase = createClient()

    // Get center's subscription tier
    const { data: centerData } = await supabase
      .from('tutorial_centers')
      .select('subscription_tier')
      .eq('id', user.center_id)
      .single()

    const center = centerData as { subscription_tier: string | null } | null
    const tier = center?.subscription_tier || 'starter'
    const limit = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS]?.maxStaff ?? 2

    // Count active staff
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('center_id', user.center_id)
      .eq('role', 'center_staff')
      .eq('is_active', true)

    const current = count || 0
    const isUnlimited = limit === -1

    setStaffLimit({
      current,
      limit,
      tier,
      canAdd: isUnlimited || current < limit,
    })
  }

  function validateForm() {
    const errors: Record<string, string> = {}

    if (!addForm.full_name.trim()) {
      errors.full_name = 'Full name is required'
    }
    if (!addForm.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      errors.email = 'Please enter a valid email'
    }
    if (!addForm.password) {
      errors.password = 'Password is required'
    } else if (addForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !user?.center_id) return

    setIsAddingStaff(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email.toLowerCase().trim(),
          password: addForm.password,
          full_name: addForm.full_name.trim(),
          phone: addForm.phone.trim() || null,
          role: 'center_staff',
          center_id: user.center_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff member')
      }

      toast.success('Staff member added successfully!')
      setShowAddModal(false)
      setAddForm({ full_name: '', email: '', phone: '', password: '' })
      fetchStaff()
      fetchStaffLimit()
    } catch (error) {
      console.error('Error adding staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add staff member')
    } finally {
      setIsAddingStaff(false)
    }
  }

  async function handleDeactivateStaff() {
    if (!deactivateModal.staff) return
    setIsDeactivating(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false } as never)
        .eq('id', deactivateModal.staff.id)

      if (error) throw error

      toast.success('Staff member deactivated')
      setDeactivateModal({ open: false, staff: null })
      fetchStaff()
      fetchStaffLimit()
    } catch (error) {
      console.error('Error deactivating staff:', error)
      toast.error('Failed to deactivate staff member')
    } finally {
      setIsDeactivating(false)
    }
  }

  async function handleReactivateStaff(staffMember: StaffMember) {
    // Check if we can reactivate (within limit)
    if (staffLimit && !staffLimit.canAdd && staffLimit.limit !== -1) {
      toast.error(`Cannot reactivate: You've reached your staff limit of ${staffLimit.limit}`)
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true } as never)
        .eq('id', staffMember.id)

      if (error) throw error

      toast.success('Staff member reactivated')
      fetchStaff()
      fetchStaffLimit()
    } catch (error) {
      console.error('Error reactivating staff:', error)
      toast.error('Failed to reactivate staff member')
    }
  }

  const filteredStaff = staff.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeStaff = filteredStaff.filter((s) => s.is_active)
  const inactiveStaff = filteredStaff.filter((s) => !s.is_active)

  // Check if on Micro plan (no staff allowed)
  const isMicroPlan = staffLimit?.limit === 0

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Manage your tutorial center staff members
            </p>
          </div>
          {staffLimit && !isMicroPlan && (
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                if (!staffLimit.canAdd) {
                  toast.error(`You've reached your staff limit of ${staffLimit.limit}. Upgrade to add more.`)
                  return
                }
                setAddForm({ full_name: '', email: '', phone: '', password: '' })
                setFormErrors({})
                setShowAddModal(true)
              }}
              disabled={!staffLimit.canAdd}
            >
              Add Staff
            </Button>
          )}
        </div>
      </div>

      {/* Staff Limit Banner */}
      {staffLimit && (
        <div className={`rounded-xl p-4 mb-6 ${
          isMicroPlan
            ? 'bg-amber-50 border border-amber-200'
            : staffLimit.canAdd
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isMicroPlan ? (
                <Lock className="w-5 h-5 text-amber-600" />
              ) : (
                <Users className="w-5 h-5 text-blue-600" />
              )}
              <div>
                {isMicroPlan ? (
                  <>
                    <p className="font-medium text-amber-900">Staff Not Available on Micro Plan</p>
                    <p className="text-sm text-amber-700">
                      Upgrade to Starter (R199/mo) to add up to 2 staff members
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">
                      Staff: {staffLimit.current} / {staffLimit.limit === -1 ? 'Unlimited' : staffLimit.limit}
                    </p>
                    <p className="text-sm text-gray-600">
                      {staffLimit.limit === -1
                        ? 'Premium plan - unlimited staff'
                        : staffLimit.canAdd
                          ? `${staffLimit.limit - staffLimit.current} staff slots remaining`
                          : 'Staff limit reached'}
                    </p>
                  </>
                )}
              </div>
            </div>
            {(isMicroPlan || !staffLimit.canAdd) && (
              <Link href="/dashboard/subscription">
                <Button variant="outline" size="sm" leftIcon={<Crown className="w-4 h-4" />}>
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Micro Plan - Show upgrade message instead of staff list */}
      {isMicroPlan ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Management Not Available</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            The Micro plan is designed for solo operators. Upgrade to Starter or higher to add staff members to help manage your tutorial center.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/subscription">
              <Button leftIcon={<Crown className="w-4 h-4" />}>
                View Upgrade Options
              </Button>
            </Link>
          </div>

          {/* Plan comparison */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-4">Staff Limits by Plan</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {[
                { name: 'Micro', price: 'R99', staff: '0', current: subscriptionTier === 'micro' },
                { name: 'Starter', price: 'R199', staff: '2', current: subscriptionTier === 'starter' },
                { name: 'Standard', price: 'R399', staff: '5', current: subscriptionTier === 'standard' },
                { name: 'Premium', price: 'R599', staff: 'Unlimited', current: subscriptionTier === 'premium' },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`p-3 rounded-lg border ${
                    plan.current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500">{plan.price}/mo</p>
                  <p className="text-sm font-medium text-blue-600 mt-1">{plan.staff} staff</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Staff List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                <p className="text-gray-500 mt-2">Loading staff...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
                <p className="text-gray-500 mb-4">Add staff to help manage your tutorial center</p>
                {staffLimit?.canAdd && (
                  <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setAddForm({ full_name: '', email: '', phone: '', password: '' })
                      setFormErrors({})
                      setShowAddModal(true)
                    }}
                  >
                    Add Your First Staff Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Active Staff */}
                {activeStaff.length > 0 && (
                  <>
                    <div className="px-6 py-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-600">Active Staff ({activeStaff.length})</p>
                    </div>
                    {activeStaff.map((member) => (
                      <div key={member.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-medium">
                              {member.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.full_name}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </span>
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {member.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-14 md:ml-0">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeactivateModal({ open: true, staff: member })}
                          >
                            Deactivate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Inactive Staff */}
                {inactiveStaff.length > 0 && (
                  <>
                    <div className="px-6 py-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-600">Inactive Staff ({inactiveStaff.length})</p>
                    </div>
                    {inactiveStaff.map((member) => (
                      <div key={member.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 font-medium">
                              {member.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">{member.full_name}</p>
                            <p className="text-sm text-gray-400">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-14 md:ml-0">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            <UserX className="w-3 h-3" />
                            Inactive
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateStaff(member)}
                            disabled={staffLimit ? !staffLimit.canAdd && staffLimit.limit !== -1 : false}
                          >
                            Reactivate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Staff Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <Input
                label="Full Name"
                required
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                error={formErrors.full_name}
                placeholder="e.g., John Smith"
              />
              <Input
                label="Email"
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                error={formErrors.email}
                placeholder="e.g., john@example.com"
              />
              <Input
                label="Phone (Optional)"
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="e.g., 081 234 5678"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Share this password with the staff member so they can log in
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900 mb-1">Staff Permissions</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• View and manage students</li>
                  <li>• View and manage payments</li>
                  <li>• Access enabled modules (Library, etc.)</li>
                  <li>• Cannot access settings or billing</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAddingStaff}
                  leftIcon={isAddingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  className="flex-1"
                >
                  {isAddingStaff ? 'Adding...' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      <ConfirmModal
        isOpen={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, staff: null })}
        onConfirm={handleDeactivateStaff}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate "${deactivateModal.staff?.full_name}"? They will no longer be able to log in. You can reactivate them later.`}
        confirmText="Deactivate"
        isLoading={isDeactivating}
      />
    </div>
  )
}
