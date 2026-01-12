import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RegisterRequest {
  studentId: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { studentId, email, password } = body

    if (!studentId || !email || !password) {
      return NextResponse.json(
        { error: 'Student ID, email, and password are required' },
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

    // Verify the student exists and doesn't already have an auth account
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, email, auth_user_id, status, center_id')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student record not found' },
        { status: 404 }
      )
    }

    if (student.auth_user_id) {
      return NextResponse.json(
        { error: 'This student already has an account. Please login instead.' },
        { status: 400 }
      )
    }

    if (student.status !== 'active') {
      return NextResponse.json(
        { error: 'Student account is not active. Please contact your tutorial center.' },
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
        full_name: student.full_name,
        role: 'student',
        student_id: studentId,
        center_id: student.center_id,
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

    // Link the auth user to the student record
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        auth_user_id: authData.user.id,
        email: email, // Update email if different
      })
      .eq('id', studentId)

    if (updateError) {
      console.error('Error linking auth user to student:', updateError)
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
    console.error('Student registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
