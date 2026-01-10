import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Type definitions for Supabase queries
interface ReferralRecord {
  id: string
  status: string
  referrer_reward_months?: number
  referred_extra_trial_days?: number
  created_at: string
  qualifying_started_at?: string | null
  completed_at?: string | null
  referred_email?: string
  referred_center?: {
    id: string
    name: string
    subscription_status: string
  } | null
}

interface RewardRecord {
  id: string
  free_months: string | number
  reward_type: string
  description: string
  is_applied: boolean
  created_at: string
}

interface ReferralCodeRecord {
  id: string
  code: string
  is_active: boolean
  center_id: string
  total_referrals?: number
}

// GET - Fetch referral data for the current user's center
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center
    const { data: profile } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    const userProfile = profile as { center_id: string; role: string } | null

    if (!userProfile?.center_id) {
      return NextResponse.json({ error: 'No center found' }, { status: 400 })
    }

    // Check and complete any qualifying referrals that have passed 30 days
    // This runs every time the dashboard loads to process matured referrals
    try {
      await supabase.rpc('complete_qualifying_referrals')
    } catch (e) {
      // Function may not exist yet if migration hasn't run - ignore
      console.log('complete_qualifying_referrals not available yet')
    }

    // Get center's referral code
    const { data: referralCodeData } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('center_id', userProfile.center_id)
      .single()

    const referralCode = referralCodeData as ReferralCodeRecord | null

    // Get referrals made by this center
    const { data: referralsData } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_center:tutorial_centers!referrals_referred_center_id_fkey(
          id, name, subscription_status
        )
      `)
      .eq('referrer_center_id', userProfile.center_id)
      .order('created_at', { ascending: false })

    const referralsMade = (referralsData || []) as ReferralRecord[]

    // Get rewards earned
    const { data: rewardsData } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('center_id', userProfile.center_id)
      .order('created_at', { ascending: false })

    const rewards = (rewardsData || []) as RewardRecord[]

    // Get center's free months balance
    const { data: centerData } = await supabase
      .from('tutorial_centers')
      .select('referral_free_months')
      .eq('id', userProfile.center_id)
      .single()

    const center = centerData as { referral_free_months?: number } | null

    // Calculate stats
    const totalReferrals = referralsMade.length
    const successfulReferrals = referralsMade.filter(r => r.status === 'completed' || r.status === 'rewarded').length
    const pendingReferrals = referralsMade.filter(r => r.status === 'pending').length
    const totalFreeMonthsEarned = rewards.reduce((sum, r) => sum + (parseInt(String(r.free_months)) || 0), 0)

    return NextResponse.json({
      referralCode: referralCode?.code || null,
      referralCodeId: referralCode?.id || null,
      referrals: referralsMade,
      rewards: rewards,
      freeMonthsBalance: center?.referral_free_months || 0,
      stats: {
        totalReferrals,
        successfulReferrals,
        pendingReferrals,
        totalFreeMonthsEarned,
      },
    })
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    )
  }
}

// POST - Create a new referral (when someone uses a referral code)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralCode, referredEmail } = body

    if (!referralCode || !referredEmail) {
      return NextResponse.json(
        { error: 'Referral code and email are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Look up the referral code
    const { data: codeResult, error: codeError } = await supabase
      .from('referral_codes')
      .select('id, center_id, is_active, total_referrals')
      .eq('code', referralCode.toUpperCase())
      .single()

    const codeData = codeResult as ReferralCodeRecord | null

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      )
    }

    if (!codeData.is_active) {
      return NextResponse.json(
        { error: 'This referral code is no longer active' },
        { status: 400 }
      )
    }

    // Check if this email was already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_email', referredEmail.toLowerCase())
      .single()

    if (existingReferral) {
      return NextResponse.json(
        { error: 'This email has already been referred' },
        { status: 400 }
      )
    }

    // Create the referral
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        referral_code_id: codeData.id,
        referrer_center_id: codeData.center_id,
        referred_email: referredEmail.toLowerCase(),
        status: 'pending',
      })
      .select()
      .single()

    if (referralError) {
      console.error('Error creating referral:', referralError)
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      )
    }

    // Update total referrals count
    await supabase
      .from('referral_codes')
      .update({
        total_referrals: (codeData.total_referrals || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', codeData.id)

    return NextResponse.json({
      success: true,
      referral,
      message: 'Referral code applied! You\'ll both receive credits when you subscribe.',
    })
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json(
      { error: 'Failed to apply referral code' },
      { status: 500 }
    )
  }
}
