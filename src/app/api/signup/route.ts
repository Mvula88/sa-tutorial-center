import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const body = await request.json()
    const { centerName, centerPhone, centerCity, fullName, email, phone, password } = body

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

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

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

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now sign in.',
      centerId: center.id,
      userId: authData.user.id,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
