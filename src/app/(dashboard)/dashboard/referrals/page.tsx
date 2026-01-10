'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Gift,
  Users,
  Copy,
  Check,
  Share2,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageCircle,
  Mail,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Referral {
  id: string
  referred_email: string
  status: 'pending' | 'completed' | 'rewarded' | 'expired'
  referrer_reward_amount: number
  referred_reward_amount: number
  created_at: string
  completed_at: string | null
  referred_center?: {
    id: string
    name: string
    subscription_status: string
  } | null
}

interface Reward {
  id: string
  amount: number
  reward_type: string
  description: string
  is_applied: boolean
  created_at: string
}

interface ReferralData {
  referralCode: string | null
  referrals: Referral[]
  rewards: Reward[]
  creditBalance: number
  stats: {
    totalReferrals: number
    successfulReferrals: number
    pendingReferrals: number
    totalEarned: number
  }
}

export default function ReferralsPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<ReferralData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchReferralData()
  }, [])

  async function fetchReferralData() {
    try {
      const response = await fetch('/api/referrals')
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        toast.error(result.error || 'Failed to load referral data')
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
      toast.error('Failed to load referral data')
    } finally {
      setIsLoading(false)
    }
  }

  const referralLink = data?.referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${data.referralCode}`
    : ''

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const shareViaWhatsApp = () => {
    const message = `Join SA Tutorial Centres and get R50 credit on your first month! Use my referral code: ${data?.referralCode}\n\nSign up here: ${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const shareViaEmail = () => {
    const subject = 'Join SA Tutorial Centres - Get R50 Credit!'
    const body = `Hi!\n\nI've been using SA Tutorial Centres to manage my tutorial center and it's been great!\n\nIf you sign up using my referral code, you'll get R50 credit on your first month.\n\nReferral Code: ${data?.referralCode}\n\nSign up here: ${referralLink}\n\nBest regards`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'completed':
      case 'rewarded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Expired
          </span>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
        <p className="text-gray-500 mt-1">
          Invite other tutorial centres and earn R100 for each successful referral!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.stats.totalReferrals || 0}</p>
              <p className="text-xs text-gray-500">Total Referrals</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.stats.successfulReferrals || 0}</p>
              <p className="text-xs text-gray-500">Successful</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data?.stats.pendingReferrals || 0}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">R{data?.stats.totalEarned || 0}</p>
              <p className="text-xs text-gray-500">Total Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Balance Banner */}
      {(data?.creditBalance || 0) > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Your Credit Balance</p>
              <p className="text-3xl font-bold">R{data?.creditBalance}</p>
              <p className="text-green-100 text-sm mt-1">
                This will be applied to your next subscription payment
              </p>
            </div>
            <Gift className="w-12 h-12 text-green-200" />
          </div>
        </div>
      )}

      {/* Referral Code Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Gift className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Referral Code</h2>
            <p className="text-sm text-gray-500">Share this code with other tutorial centres</p>
          </div>
        </div>

        {/* Code Display */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Your Code</p>
              <p className="text-2xl font-bold text-gray-900 font-mono tracking-wider">
                {data?.referralCode || 'Loading...'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(data?.referralCode || '')}
              leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-2">Or share your referral link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(referralLink)}
              leftIcon={<Copy className="w-4 h-4" />}
            >
              Copy
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={shareViaWhatsApp}
            leftIcon={<MessageCircle className="w-4 h-4" />}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          >
            Share via WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={shareViaEmail}
            leftIcon={<Mail className="w-4 h-4" />}
          >
            Share via Email
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Join SA Tutorial Centres',
                  text: `Use my referral code ${data?.referralCode} to get R50 credit!`,
                  url: referralLink,
                })
              } else {
                copyToClipboard(referralLink)
              }
            }}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Share Your Code</p>
              <p className="text-sm text-gray-600">
                Send your referral code to other tutorial centre owners
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">They Sign Up</p>
              <p className="text-sm text-gray-600">
                They use your code when creating their account
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">You Both Earn</p>
              <p className="text-sm text-gray-600">
                You get R100, they get R50 when they subscribe!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Referrals</h3>

        {data?.referrals && data.referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Referred</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Status</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Reward</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">
                        {referral.referred_center?.name || referral.referred_email}
                      </p>
                      {referral.referred_center && (
                        <p className="text-xs text-gray-500">{referral.referred_email}</p>
                      )}
                    </td>
                    <td className="py-3">{getStatusBadge(referral.status)}</td>
                    <td className="py-3">
                      {referral.status === 'completed' || referral.status === 'rewarded' ? (
                        <span className="text-green-600 font-medium">
                          +R{referral.referrer_reward_amount}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No referrals yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Share your code to start earning rewards!
            </p>
          </div>
        )}
      </div>

      {/* Rewards History */}
      {data?.rewards && data.rewards.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Rewards History</h3>
          <div className="space-y-3">
            {data.rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{reward.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(reward.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-green-600 font-bold">+R{reward.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
