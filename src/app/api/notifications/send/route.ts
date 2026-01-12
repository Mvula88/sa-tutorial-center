import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueNotification, processNotifications } from '@/lib/notifications'

interface SendNotificationRequest {
  recipientType: 'parent' | 'student' | 'teacher'
  recipientId?: string
  recipientIds?: string[]
  notificationType: string
  title: string
  message: string
  channel: 'email' | 'sms' | 'both'
  processImmediately?: boolean
}

/**
 * Send notification(s) to recipients
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center and role
    const { data: userData } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    // Only center admins can send notifications
    if (!['center_admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: SendNotificationRequest = await request.json()
    const { recipientType, recipientId, recipientIds, notificationType, title, message, channel, processImmediately } = body

    if (!recipientType || !notificationType || !title || !message || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ids = recipientIds || (recipientId ? [recipientId] : [])
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No recipients specified' }, { status: 400 })
    }

    // Queue notifications for each recipient
    const queued: string[] = []
    const failed: string[] = []

    for (const id of ids) {
      const result = await queueNotification({
        centerId: userData.center_id,
        recipientType,
        recipientId: id,
        notificationType,
        title,
        message,
        channel,
        createdBy: user.id,
      })

      if (result.success && result.notificationId) {
        queued.push(result.notificationId)
      } else {
        failed.push(id)
      }
    }

    // Optionally process immediately
    if (processImmediately && queued.length > 0) {
      await processNotifications(queued.length)
    }

    return NextResponse.json({
      success: true,
      queued: queued.length,
      failed: failed.length,
      processedImmediately: processImmediately || false,
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get notification queue status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center
    const { data: userData } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('center_id', userData.center_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get counts by status
    const { data: counts } = await supabase
      .from('notification_queue')
      .select('status')
      .eq('center_id', userData.center_id)

    const statusCounts = {
      pending: 0,
      scheduled: 0,
      sent: 0,
      failed: 0,
    }

    counts?.forEach((n) => {
      if (n.status in statusCounts) {
        statusCounts[n.status as keyof typeof statusCounts]++
      }
    })

    return NextResponse.json({
      success: true,
      notifications,
      counts: statusCounts,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
