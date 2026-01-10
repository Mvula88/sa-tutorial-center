import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validatePasswordForAPI } from '@/lib/password-validation'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Use service role for signup (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute)
    const rateLimitResponse = await rateLimit(request, {
      ...RATE_LIMITS.signup,
      keyPrefix: 'signup',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    let { centerName, centerPhone, centerCity, fullName, email, phone, password, referralCode } = body

    // Sanitize text inputs
    centerName = sanitizeText(centerName || '')
    centerCity = sanitizeText(centerCity || '')
    fullName = sanitizeText(fullName || '')
    email = sanitizeEmail(email || '')

    // Validate required fields
    if (!centerName || !centerCity || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password with strong policy
    const passwordError = validatePasswordForAPI(password)
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      )
    }

    // Validate South African phone number if provided
    if (phone && !/^(\+?27|0)[0-9]{9}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid South African phone number format' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = generateSlug(centerName)
    let slugExists = true
    let slugSuffix = 0

    while (slugExists) {
      const checkSlug = slugSuffix === 0 ? slug : `${slug}-${slugSuffix}`
      const { data: existingCenter } = await supabase
        .from('tutorial_centers')
        .select('id')
        .eq('slug', checkSlug)
        .single()

      if (!existingCenter) {
        slug = checkSlug
        slugExists = false
      } else {
        slugSuffix++
      }
    }

    // Validate referral code if provided (do this first to determine trial length)
    let validReferralCode: { id: string; center_id: string } | null = null
    if (referralCode) {
      const { data: refCode } = await supabase
        .from('referral_codes')
        .select('id, center_id, is_active')
        .eq('code', referralCode.toUpperCase())
        .single()

      if (refCode && refCode.is_active) {
        validReferralCode = refCode as { id: string; center_id: string }
      }
    }

    // Calculate trial end date (28 days if referred, 14 days otherwise)
    const trialDays = validReferralCode ? 28 : 14
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

    // Step 1: Create tutorial center with trial status
    const { data: center, error: centerError } = await supabase
      .from('tutorial_centers')
      .insert({
        name: centerName,
        slug,
        phone: centerPhone || null,
        city: centerCity,
        email: email,
        status: 'active',
        subscription_status: 'trialing',
        subscription_tier: 'starter',
        trial_ends_at: trialEndsAt.toISOString(),
        payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9], // Feb-Oct default (South African school year)
        default_registration_fee: 300,
        referred_by_code: validReferralCode ? referralCode.toUpperCase() : null,
      })
      .select()
      .single()

    if (centerError) {
      console.error('Error creating center:', centerError)
      return NextResponse.json(
        { error: 'Failed to create tutorial center' },
        { status: 500 }
      )
    }

    // Step 2: Create auth user (auto-confirm for immediate access to trial)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for trial signup - no email verification needed
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      // Rollback: delete the center if user creation failed
      await supabase.from('tutorial_centers').delete().eq('id', center.id)

      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Step 3: Create user profile as center_admin
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        role: 'center_admin',
        center_id: center.id,
        is_active: true,
      })

    if (userError) {
      // Rollback: delete auth user and center
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('tutorial_centers').delete().eq('id', center.id)

      console.error('Error creating user profile:', userError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Step 4: Create default subjects for the center
    const defaultSubjects = [
      { name: 'Mathematics', monthly_fee: 350 },
      { name: 'English', monthly_fee: 300 },
      { name: 'Physical Science', monthly_fee: 350 },
      { name: 'Life Sciences', monthly_fee: 300 },
      { name: 'Accounting', monthly_fee: 300 },
    ]

    await supabase
      .from('subjects')
      .insert(
        defaultSubjects.map((subject) => ({
          center_id: center.id,
          name: subject.name,
          monthly_fee: subject.monthly_fee,
          is_active: true,
        }))
      )

    // Step 5: Create referral tracking if valid referral code was used
    if (validReferralCode) {
      // Create the referral record
      await supabase
        .from('referrals')
        .insert({
          referral_code_id: validReferralCode.id,
          referrer_center_id: validReferralCode.center_id,
          referred_center_id: center.id,
          referred_email: email.toLowerCase(),
          status: 'pending',
          referrer_reward_months: 1,
          referred_extra_trial_days: 14,
        })

      // Update total referrals count on the referral code
      // First get current count, then increment
      const { data: currentCode } = await supabase
        .from('referral_codes')
        .select('total_referrals')
        .eq('id', validReferralCode.id)
        .single()

      await supabase
        .from('referral_codes')
        .update({
          total_referrals: ((currentCode as { total_referrals: number } | null)?.total_referrals || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validReferralCode.id)

      // Note: Rewards are granted automatically when subscription becomes active
      // via the database trigger (complete_referral_on_subscription)
    }

    return NextResponse.json({
      success: true,
      message: validReferralCode
        ? `Account created successfully! You have a ${trialDays}-day free trial. Sign in to get started!`
        : 'Account created successfully! You can now sign in.',
      centerId: center.id,
      userId: authData.user.id,
      referralApplied: !!validReferralCode,
      trialDays,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
