'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { AlertTriangle, CreditCard, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function TrialExpiredModal() {
  const { user, isCenterAdmin } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    async function checkTrialStatus() {
      if (!user?.center_id || !isCenterAdmin) {
        setIsLoading(false)
        return
      }

      try {
        const { data: center } = await supabase
          .from('tutorial_centers')
          .select('subscription_status, trial_ends_at')
          .eq('id', user.center_id)
          .single<{ subscription_status: string; trial_ends_at: string | null }>()

        if (center) {
          const isTrialing = center.subscription_status === 'trialing'
          const trialEndsAt = center.trial_ends_at ? new Date(center.trial_ends_at) : null

          if (isTrialing && trialEndsAt) {
            const now = new Date()
            const expired = trialEndsAt < now
            setIsExpired(expired)

            if (!expired) {
              const days = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              setDaysLeft(days)
            }
          } else if (center.subscription_status === 'active') {
            // Has active subscription
            setIsExpired(false)
          }
        }
      } catch (error) {
        console.error('Error checking trial status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkTrialStatus()
  }, [user?.center_id, isCenterAdmin, supabase])

  if (isLoading || !isExpired) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Your Trial Has Ended</h2>
          <p className="text-amber-100 mt-2">Choose a plan to continue using all features</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800">
                  Your free trial period has ended. Subscribe to a plan to continue managing your tutorial centre.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-600">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="text-sm">All your data is safe and preserved</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <CreditCard className="w-5 h-5 text-blue-500" />
              <span className="text-sm">Plans start from just R99/month</span>
            </div>
          </div>

          <Link
            href="/dashboard/subscription"
            className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            Choose a Plan
          </Link>

          <p className="text-center text-xs text-gray-500 mt-4">
            Need help? Contact support@satutorialcentres.co.za
          </p>
        </div>
      </div>
    </div>
  )
}
