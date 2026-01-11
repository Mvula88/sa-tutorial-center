import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { PLAN_LIMITS, SubscriptionTier } from '@/lib/subscription-limits'

// Create admin client with service role key
function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Check staff limit for a center (server-side version)
async function checkStaffLimitServer(supabase: ReturnType<typeof createAdminClient>, centerId: string) {
  // Get center's subscription tier
  const { data: centerData } = await supabase
    .from('tutorial_centers')
    .select('subscription_tier')
    .eq('id', centerId)
    .single()

  const center = centerData as { subscription_tier: string | null } | null
  const tier = (center?.subscription_tier as SubscriptionTier) || 'starter'
  const limit = PLAN_LIMITS[tier]?.maxStaff ?? PLAN_LIMITS.starter.maxStaff

  // Count active staff members (center_staff role only)
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('center_id', centerId)
    .eq('role', 'center_staff')
    .eq('is_active', true)

  const current = count || 0
  const isUnlimited = limit === -1

  return {
    canAdd: isUnlimited || current < limit,
    current,
    limit,
    tier,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, full_name, phone, role, center_id } = body

    // Validation
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (role !== 'super_admin' && !center_id) {
      return NextResponse.json(
        { error: 'Center is required for non-super admin users' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check staff limit for center_staff role
    if (role === 'center_staff' && center_id) {
      const staffLimit = await checkStaffLimitServer(supabase, center_id)

      if (!staffLimit.canAdd) {
        if (staffLimit.limit === 0) {
          return NextResponse.json(
            { error: 'Your Micro plan does not include additional staff members. Please upgrade to the Starter plan or higher to add staff.' },
            { status: 403 }
          )
        }
        return NextResponse.json(
          { error: `You have reached your staff limit of ${staffLimit.limit} for the ${staffLimit.tier} plan. Please upgrade to add more staff members.` },
          { status: 403 }
        )
      }
    }

    // Create auth user with admin API (creates confirmed user)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 500 }
      )
    }

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        phone: phone || null,
        role,
        center_id: role === 'super_admin' ? null : center_id,
        is_active: true,
      } as never)

    if (profileError) {
      console.error('Profile error:', profileError)
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        full_name,
        role,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
