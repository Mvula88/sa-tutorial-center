import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      center_id,
      student_id,
      original_payment_id,
      amount,
      reason,
      reason_notes,
      update_student_status,
      processed_by,
    } = body

    // Validate required fields
    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }
    if (!student_id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }
    if (!original_payment_id) {
      return NextResponse.json({ error: 'Original payment ID is required' }, { status: 400 })
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid refund amount is required' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 })
    }
    if (!processed_by) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate reason is 'other' requires notes
    if (reason === 'other' && !reason_notes) {
      return NextResponse.json(
        { error: 'Notes are required when reason is "Other"' },
        { status: 400 }
      )
    }

    // Verify the user is a center admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, center_id')
      .eq('id', processed_by)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'center_admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only administrators can process refunds' },
        { status: 403 }
      )
    }

    if (user.role === 'center_admin' && user.center_id !== center_id) {
      return NextResponse.json(
        { error: 'You can only process refunds for your own center' },
        { status: 403 }
      )
    }

    // Get the original payment to verify it exists and get details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount, center_id, student_id')
      .eq('id', original_payment_id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Original payment not found' }, { status: 404 })
    }

    // Verify payment belongs to the same center
    if (payment.center_id !== center_id) {
      return NextResponse.json(
        { error: 'Payment does not belong to this center' },
        { status: 403 }
      )
    }

    // Get existing refunds for this payment to prevent over-refunding
    const { data: existingRefunds } = await supabase
      .from('refunds')
      .select('amount')
      .eq('original_payment_id', original_payment_id)

    const totalAlreadyRefunded = (existingRefunds || []).reduce(
      (sum, r) => sum + Number(r.amount),
      0
    )
    const remainingRefundable = payment.amount - totalAlreadyRefunded

    // Verify refund amount doesn't exceed remaining refundable amount
    if (amount > remainingRefundable) {
      if (remainingRefundable <= 0) {
        return NextResponse.json(
          { error: 'This payment has already been fully refunded' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Refund amount cannot exceed R ${remainingRefundable.toFixed(2)} (remaining refundable amount)` },
        { status: 400 }
      )
    }

    // Create the refund record
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        center_id,
        student_id,
        original_payment_id,
        amount,
        reason,
        reason_notes: reason_notes || null,
        student_status_updated: update_student_status || false,
        processed_by,
        refund_date: new Date().toISOString(),
      })
      .select(`
        *,
        student:students(id, full_name, student_number),
        payment:payments(id, amount, payment_date, payment_method),
        processor:users!refunds_processed_by_fkey(id, full_name)
      `)
      .single()

    if (refundError) {
      console.error('Failed to create refund:', refundError)
      return NextResponse.json(
        { error: 'Failed to create refund record' },
        { status: 500 }
      )
    }

    // Update student status if requested
    if (update_student_status) {
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({
          status: 'withdrawn',
          updated_at: new Date().toISOString(),
        })
        .eq('id', student_id)

      if (studentUpdateError) {
        console.error('Failed to update student status:', studentUpdateError)
        // Don't fail the refund, just log the error
      }
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      center_id,
      user_id: processed_by,
      action: 'create',
      entity_type: 'refund',
      entity_id: refund.id,
      new_values: {
        amount,
        reason,
        reason_notes,
        original_payment_id,
        student_id,
        student_status_updated: update_student_status || false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      refund,
    })
  } catch (error) {
    console.error('Refund processing error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const center_id = searchParams.get('center_id')
    const student_id = searchParams.get('student_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    let query = supabase
      .from('refunds')
      .select(`
        *,
        student:students(id, full_name, student_number),
        payment:payments(id, amount, payment_date, payment_method, reference_number),
        processor:users!refunds_processed_by_fkey(id, full_name)
      `, { count: 'exact' })
      .eq('center_id', center_id)
      .order('refund_date', { ascending: false })

    if (student_id) {
      query = query.eq('student_id', student_id)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: refunds, count, error } = await query

    if (error) {
      console.error('Failed to fetch refunds:', error)
      return NextResponse.json({ error: 'Failed to fetch refunds' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      refunds,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Fetch refunds error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
