import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RegisterRequest {
  teacherId: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { teacherId, email, password } = body

    if (!teacherId || !email || !password) {
      return NextResponse.json(
        { error: 'Teacher ID, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the teacher exists and doesn't already have an auth account
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .select('id, full_name, email, auth_user_id, status, center_id')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Teacher record not found' },
        { status: 404 }
      )
    }

    if (teacher.auth_user_id) {
      return NextResponse.json(
        { error: 'This teacher already has an account. Please login instead.' },
        { status: 400 }
      )
    }

    if (teacher.status !== 'active') {
      return NextResponse.json(
        { error: 'Teacher account is not active. Please contact your tutorial center.' },
        { status: 400 }
      )
    }

    // Check if email is already in use by another auth user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailInUse = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())

    if (emailInUse) {
      return NextResponse.json(
        { error: 'This email is already registered. Please use a different email or login.' },
        { status: 400 }
      )
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now, or set to false to require email verification
      user_metadata: {
        full_name: teacher.full_name,
        role: 'teacher',
        teacher_id: teacherId,
        center_id: teacher.center_id,
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Link the auth user to the teacher record
    const { error: updateError } = await supabaseAdmin
      .from('teachers')
      .update({
        auth_user_id: authData.user.id,
        email: email, // Update email if different
      })
      .eq('id', teacherId)

    if (updateError) {
      console.error('Error linking auth user to teacher:', updateError)
      // Try to clean up the created auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to link account. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now login.',
    })
  } catch (error) {
    console.error('Teacher registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
