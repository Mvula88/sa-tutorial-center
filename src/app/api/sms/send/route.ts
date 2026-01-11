import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS, isValidSAPhoneNumber } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('center_id')
      .eq('id', user.id)
      .single()

    const userData = userDataRaw as { center_id: string | null } | null

    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    const body = await request.json()
    const { to, message, campaignId, studentId } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 })
    }

    // Validate phone number
    if (!isValidSAPhoneNumber(to)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid South African phone number'
      }, { status: 400 })
    }

    // Send SMS
    const result = await sendSMS(to, message)

    // Log the SMS
    await supabase.from('sms_logs').insert({
      center_id: userData.center_id,
      phone_number: to,
      message: message,
      message_type: campaignId ? 'campaign' : 'notification',
      campaign_id: campaignId || null,
      student_id: studentId || null,
      status: result.success ? 'sent' : 'failed',
      message_id: result.messageId || null,
      error_message: result.error || null,
      sent_by: user.id,
    } as never)

    return NextResponse.json(result)
  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send SMS'
    }, { status: 500 })
  }
}
