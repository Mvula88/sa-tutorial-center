'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User,
  Building2,
  Shield,
  CreditCard,
  Palette,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Home,
  Bus,
  BookOpen,
  MessageSquare,
  Calendar,
  CheckCircle,
  Zap,
  ExternalLink,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CenterData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  primary_color: string
  secondary_color: string
  bank_name: string
  account_number: string
  branch_code: string
  hostel_module_enabled: boolean
  transport_module_enabled: boolean
  library_module_enabled: boolean
  sms_module_enabled: boolean
  payment_months: number[]
  default_registration_fee: number
}

interface SubscriptionData {
  subscription_status: string
  subscription_tier: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

const MONTHS = [
  { value: 0, label: 'January', short: 'Jan' },
  { value: 1, label: 'February', short: 'Feb' },
  { value: 2, label: 'March', short: 'Mar' },
  { value: 3, label: 'April', short: 'Apr' },
  { value: 4, label: 'May', short: 'May' },
  { value: 5, label: 'June', short: 'Jun' },
  { value: 6, label: 'July', short: 'Jul' },
  { value: 7, label: 'August', short: 'Aug' },
  { value: 8, label: 'September', short: 'Sep' },
  { value: 9, label: 'October', short: 'Oct' },
  { value: 10, label: 'November', short: 'Nov' },
  { value: 11, label: 'December', short: 'Dec' },
]

export default function CenterSettingsPage() {
  const { user, fetchUser, isCenterAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [centerData, setCenterData] = useState<CenterData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    primary_color: '#1E40AF',
    secondary_color: '#F59E0B',
    bank_name: '',
    account_number: '',
    branch_code: '',
    hostel_module_enabled: false,
    transport_module_enabled: false,
    library_module_enabled: false,
    sms_module_enabled: false,
    payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9], // Feb-Oct default
    default_registration_fee: 0,
  })

  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscription_status: 'inactive',
    subscription_tier: 'starter',
    current_period_end: null,
    cancel_at_period_end: false,
    trial_ends_at: null,
    stripe_customer_id: null,
  })

  const [isPortalLoading, setIsPortalLoading] = useState(false)

  useEffect(() => {
    if (user?.center) {
      fetchCenterData()
    }
  }, [user?.center_id])

  async function fetchCenterData() {
    if (!user?.center_id) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('tutorial_centers')
      .select('*')
      .eq('id', user.center_id)
      .single()

    if (!error && data) {
      const center = data as CenterData & SubscriptionData & { name: string }
      setCenterData({
        name: center.name || '',
        email: center.email || '',
        phone: center.phone || '',
        address: center.address || '',
        city: center.city || '',
        primary_color: center.primary_color || '#1E40AF',
        secondary_color: center.secondary_color || '#F59E0B',
        bank_name: center.bank_name || '',
        account_number: center.account_number || '',
        branch_code: center.branch_code || '',
        hostel_module_enabled: center.hostel_module_enabled || false,
        transport_module_enabled: center.transport_module_enabled || false,
        library_module_enabled: center.library_module_enabled || false,
        sms_module_enabled: center.sms_module_enabled || false,
        payment_months: center.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9],
        default_registration_fee: center.default_registration_fee || 0,
      })
      setSubscriptionData({
        subscription_status: center.subscription_status || 'inactive',
        subscription_tier: center.subscription_tier || 'starter',
        current_period_end: center.current_period_end || null,
        cancel_at_period_end: center.cancel_at_period_end || false,
        trial_ends_at: center.trial_ends_at || null,
        stripe_customer_id: center.stripe_customer_id || null,
      })
    }
  }

  async function handleManageSubscription() {
    setIsPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal')
    } finally {
      setIsPortalLoading(false)
    }
  }

  async function handleUpgrade(plan: string) {
    setIsPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
    } finally {
      setIsPortalLoading(false)
    }
  }

  function getSubscriptionStatusBadge(status: string) {
    const statusMap: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-700', label: 'Active' },
      trialing: { color: 'bg-blue-100 text-blue-700', label: 'Trial' },
      past_due: { color: 'bg-red-100 text-red-700', label: 'Past Due' },
      cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' },
      inactive: { color: 'bg-yellow-100 text-yellow-700', label: 'Inactive' },
    }
    return statusMap[status] || statusMap.inactive
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function getDaysRemaining(dateString: string | null) {
    if (!dateString) return 0
    const endDate = new Date(dateString)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user?.id as string)

      if (error) throw error

      await fetchUser()
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCenterUpdate(e: React.FormEvent, shouldReload = false) {
    e.preventDefault()
    if (!user?.center_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('tutorial_centers')
        .update({
          email: centerData.email || null,
          phone: centerData.phone || null,
          address: centerData.address || null,
          city: centerData.city || null,
          primary_color: centerData.primary_color,
          secondary_color: centerData.secondary_color,
          bank_name: centerData.bank_name || null,
          account_number: centerData.account_number || null,
          branch_code: centerData.branch_code || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.center_id)

      if (error) throw error

      toast.success('Settings updated successfully')

      // Reload page if branding changed to apply new colors
      if (shouldReload) {
        toast.success('Applying branding changes...')
        // Force hard reload to clear all caches and apply new colors
        setTimeout(() => {
          window.location.href = window.location.href
        }, 300)
      } else {
        await fetchUser()
      }
    } catch (error) {
      console.error('Error updating center:', error)
      toast.error('Failed to update center settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      })

      if (error) throw error

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      toast.success('Password changed successfully')
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    ...(isCenterAdmin() ? [
      { id: 'subscription', label: 'Subscription', icon: <Zap className="w-4 h-4" /> },
      { id: 'center', label: 'Center Details', icon: <Building2 className="w-4 h-4" /> },
      { id: 'academic', label: 'Academic Year', icon: <Calendar className="w-4 h-4" /> },
      { id: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
      { id: 'banking', label: 'Banking', icon: <CreditCard className="w-4 h-4" /> },
    ] : []),
  ]

  const togglePaymentMonth = (month: number) => {
    const newMonths = centerData.payment_months.includes(month)
      ? centerData.payment_months.filter(m => m !== month)
      : [...centerData.payment_months, month].sort((a, b) => a - b)
    setCenterData({ ...centerData, payment_months: newMonths })
  }

  async function handleAcademicUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.center_id) return

    if (centerData.payment_months.length === 0) {
      toast.error('Please select at least one payment month')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('tutorial_centers')
        .update({
          payment_months: centerData.payment_months,
          default_registration_fee: centerData.default_registration_fee,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.center_id)

      if (error) throw error

      toast.success('Academic year settings saved!')
      await fetchUser()
    } catch (error) {
      console.error('Error updating academic settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  const modules = [
    { key: 'hostel_module_enabled', label: 'Hostel Management', icon: <Home className="w-5 h-5" />, description: 'Manage student accommodations' },
    { key: 'transport_module_enabled', label: 'Transport', icon: <Bus className="w-5 h-5" />, description: 'Manage student transport' },
    { key: 'library_module_enabled', label: 'Library', icon: <BookOpen className="w-5 h-5" />, description: 'Manage library resources' },
    { key: 'sms_module_enabled', label: 'SMS Notifications', icon: <MessageSquare className="w-5 h-5" />, description: 'Send SMS to parents' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your profile and center settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Mobile Tab Bar */}
        <div className="lg:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Tabs */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Module Status */}
          {isCenterAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Active Modules</h3>
              <div className="space-y-2">
                {modules.map((module) => (
                  <div
                    key={module.key}
                    className={`flex items-center gap-2 text-sm ${
                      centerData[module.key as keyof CenterData] ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {module.icon}
                    <span>{module.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Contact admin to enable/disable modules
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
                  <p className="text-sm text-gray-500">Update your personal information</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-900">{user?.email}</p>
                </div>

                <Input
                  label="Full Name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder="Your full name"
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+264 81 123 4567"
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                  <p className="text-sm text-gray-500">Change your password</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="relative">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                />

                <Button
                  type="submit"
                  disabled={isLoading || !passwordData.new_password}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && isCenterAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
                  <p className="text-sm text-gray-500">Manage your subscription and billing</p>
                </div>
              </div>

              {/* Current Plan */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Current Plan</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatusBadge(subscriptionData.subscription_status).color}`}>
                    {getSubscriptionStatusBadge(subscriptionData.subscription_status).label}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-medium text-gray-900 capitalize">{subscriptionData.subscription_tier}</span>
                  </div>

                  {subscriptionData.subscription_status === 'trialing' && subscriptionData.trial_ends_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trial Ends</span>
                      <span className="font-medium text-gray-900">{formatDate(subscriptionData.trial_ends_at)}</span>
                    </div>
                  )}

                  {subscriptionData.subscription_status === 'active' && subscriptionData.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Billing Date</span>
                      <span className="font-medium text-gray-900">{formatDate(subscriptionData.current_period_end)}</span>
                    </div>
                  )}

                  {subscriptionData.cancel_at_period_end && (
                    <div className="flex items-center gap-2 text-amber-600 mt-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Subscription will cancel at period end</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trial Warning */}
              {subscriptionData.subscription_status === 'trialing' && subscriptionData.trial_ends_at && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Trial Period</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        You have {getDaysRemaining(subscriptionData.trial_ends_at)} days remaining in your trial.
                        Upgrade now to continue using all features after your trial ends.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Past Due Warning */}
              {subscriptionData.subscription_status === 'past_due' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Payment Failed</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Your last payment failed. Please update your payment method to avoid service interruption.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {subscriptionData.stripe_customer_id ? (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isPortalLoading}
                    leftIcon={isPortalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    className="w-full"
                  >
                    {isPortalLoading ? 'Opening...' : 'Manage Subscription'}
                  </Button>
                ) : (
                  <>
                    {subscriptionData.subscription_status === 'trialing' || subscriptionData.subscription_status === 'inactive' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">Choose a plan to continue after your trial:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <button
                            onClick={() => handleUpgrade('micro')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <h4 className="font-medium text-gray-900">Micro</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">R99<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Up to 15 students</p>
                          </button>
                          <button
                            onClick={() => handleUpgrade('starter')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <h4 className="font-medium text-gray-900">Starter</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">R199<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Up to 50 students</p>
                          </button>
                          <button
                            onClick={() => handleUpgrade('standard')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 text-left relative"
                          >
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Popular</span>
                            <h4 className="font-medium text-gray-900">Standard</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">R399<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Up to 150 students</p>
                          </button>
                          <button
                            onClick={() => handleUpgrade('premium')}
                            disabled={isPortalLoading}
                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                          >
                            <h4 className="font-medium text-gray-900">Premium</h4>
                            <p className="text-2xl font-bold text-gray-900 mt-1">R599<span className="text-sm font-normal text-gray-500">/mo</span></p>
                            <p className="text-xs text-gray-500 mt-1">Unlimited students</p>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Features by Plan */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Plan Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Micro</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Up to 15 students</li>
                      <li>Student management</li>
                      <li>Fee tracking</li>
                      <li>Payment recording</li>
                      <li>Email support</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Starter</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Up to 50 students</li>
                      <li>Student management</li>
                      <li>Fee tracking</li>
                      <li>Basic reports</li>
                      <li>Email support</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Standard</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Up to 150 students</li>
                      <li>Everything in Starter</li>
                      <li>Library module</li>
                      <li>SMS notifications</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Premium</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>Unlimited students</li>
                      <li>Everything in Standard</li>
                      <li>Hostel management</li>
                      <li>Transport tracking</li>
                      <li>Custom branding</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Center Details Tab */}
          {activeTab === 'center' && isCenterAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Center Details</h2>
                  <p className="text-sm text-gray-500">Update your center information</p>
                </div>
              </div>

              <form onSubmit={handleCenterUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Center Name</label>
                  <div className="bg-gray-100 rounded-lg px-4 py-3 text-gray-700">
                    {centerData.name}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Contact super admin to change center name</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={centerData.email}
                    onChange={(e) => setCenterData({ ...centerData, email: e.target.value })}
                    placeholder="center@example.com"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={centerData.phone}
                    onChange={(e) => setCenterData({ ...centerData, phone: e.target.value })}
                    placeholder="+264 61 123 4567"
                  />
                </div>

                <Input
                  label="Address"
                  value={centerData.address}
                  onChange={(e) => setCenterData({ ...centerData, address: e.target.value })}
                  placeholder="Street address"
                />

                <Input
                  label="City"
                  value={centerData.city}
                  onChange={(e) => setCenterData({ ...centerData, city: e.target.value })}
                  placeholder="City"
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* Academic Year Tab */}
          {activeTab === 'academic' && isCenterAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Academic Year Settings</h2>
                  <p className="text-sm text-gray-500">Configure payment months and fees</p>
                </div>
              </div>

              <form onSubmit={handleAcademicUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Months
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Select the months when student fee payments are required. This affects yearly fee calculations.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {MONTHS.map((month) => {
                      const isSelected = centerData.payment_months.includes(month.value)
                      return (
                        <button
                          key={month.value}
                          type="button"
                          onClick={() => togglePaymentMonth(month.value)}
                          className={`relative p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-indigo-600" />
                          )}
                          <span className="text-sm font-medium">{month.short}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Selected: <span className="font-medium text-gray-900">{centerData.payment_months.length} months</span>
                    {centerData.payment_months.length > 0 && (
                      <span className="ml-2">
                        ({centerData.payment_months.map(m => MONTHS[m].short).join(', ')})
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-900 mb-2">Fee Calculation Example</h4>
                  <p className="text-sm text-indigo-700">
                    If a subject costs R 300/month, the yearly total will be:
                    <br />
                    <span className="font-bold">R 300 x {centerData.payment_months.length} months = R {(300 * centerData.payment_months.length).toLocaleString()}</span>
                  </p>
                </div>

                <div>
                  <Input
                    label="Default Registration Fee (R)"
                    type="number"
                    value={centerData.default_registration_fee}
                    onChange={(e) => setCenterData({ ...centerData, default_registration_fee: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be added to the yearly total for new students
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </Button>
              </form>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && isCenterAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Palette className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
                  <p className="text-sm text-gray-500">Customize your center&apos;s appearance</p>
                </div>
              </div>

              <form onSubmit={(e) => handleCenterUpdate(e, true)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={centerData.primary_color}
                        onChange={(e) => setCenterData({ ...centerData, primary_color: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={centerData.primary_color}
                        onChange={(e) => setCenterData({ ...centerData, primary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#1E40AF"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={centerData.secondary_color}
                        onChange={(e) => setCenterData({ ...centerData, secondary_color: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={centerData.secondary_color}
                        onChange={(e) => setCenterData({ ...centerData, secondary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#F59E0B"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-3">Preview</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="h-12 px-6 rounded-lg flex items-center text-white font-medium text-sm"
                      style={{ backgroundColor: centerData.primary_color }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="h-12 px-6 rounded-lg flex items-center text-white font-medium text-sm"
                      style={{ backgroundColor: centerData.secondary_color }}
                    >
                      Secondary
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}

          {/* Banking Tab */}
          {activeTab === 'banking' && isCenterAdmin() && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Banking Details</h2>
                  <p className="text-sm text-gray-500">Banking info for fee statements</p>
                </div>
              </div>

              <form onSubmit={handleCenterUpdate} className="space-y-6">
                <Input
                  label="Bank Name"
                  value={centerData.bank_name}
                  onChange={(e) => setCenterData({ ...centerData, bank_name: e.target.value })}
                  placeholder="e.g., First National Bank"
                />

                <Input
                  label="Account Number"
                  value={centerData.account_number}
                  onChange={(e) => setCenterData({ ...centerData, account_number: e.target.value })}
                  placeholder="Account number"
                />

                <Input
                  label="Branch Code"
                  value={centerData.branch_code}
                  onChange={(e) => setCenterData({ ...centerData, branch_code: e.target.value })}
                  placeholder="Branch code"
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    These details will appear on student fee statements for bank transfer payments.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
