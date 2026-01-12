/**
 * Notification Service
 * Handles queuing and processing of notifications (SMS, email)
 */

import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'

export interface NotificationData {
  centerId: string
  recipientType: 'parent' | 'student' | 'teacher'
  recipientId: string
  notificationType: string
  title: string
  message: string
  channel: 'email' | 'sms' | 'both'
  relatedEntityType?: string
  relatedEntityId?: string
  scheduledFor?: Date
  createdBy?: string
}

export interface QueuedNotification {
  id: string
  center_id: string
  recipient_type: string
  recipient_id: string
  notification_type: string
  title: string
  message: string
  channel: string
  status: string
  scheduled_for: string
  related_entity_type?: string
  related_entity_id?: string
}

/**
 * Queue a notification for sending
 */
export async function queueNotification(data: NotificationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: notificationData, error } = await supabase
      .from('notification_queue')
      .insert({
        center_id: data.centerId,
        recipient_type: data.recipientType,
        recipient_id: data.recipientId,
        notification_type: data.notificationType,
        title: data.title,
        message: data.message,
        channel: data.channel,
        status: data.scheduledFor && data.scheduledFor > new Date() ? 'scheduled' : 'pending',
        scheduled_for: data.scheduledFor?.toISOString() || new Date().toISOString(),
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        created_by: data.createdBy,
      } as never)
      .select('id')
      .single()

    const notification = notificationData as { id: string } | null
    if (error || !notification) {
      console.error('Error queuing notification:', error)
      return { success: false, error: error?.message || 'Failed to create notification' }
    }

    return { success: true, notificationId: notification.id }
  } catch (error) {
    console.error('Queue notification error:', error)
    return { success: false, error: 'Failed to queue notification' }
  }
}

/**
 * Process pending notifications
 */
export async function processNotifications(limit: number = 50): Promise<{ processed: number; failed: number }> {
  const supabase = await createClient()
  let processed = 0
  let failed = 0

  // Get pending notifications that are ready to send
  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .in('status', ['pending', 'scheduled'])
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (error || !notifications) {
    console.error('Error fetching notifications:', error)
    return { processed: 0, failed: 0 }
  }

  for (const notification of notifications as QueuedNotification[]) {
    try {
      const result = await sendNotification(notification)

      if (result.success) {
        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          } as never)
          .eq('id', notification.id)

        processed++
      } else {
        // Mark as failed or retry
        const retryCount = (notification as { retry_count?: number }).retry_count || 0
        if (retryCount >= 3) {
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              error_message: result.error,
              retry_count: retryCount + 1,
            } as never)
            .eq('id', notification.id)
        } else {
          // Schedule retry
          await supabase
            .from('notification_queue')
            .update({
              error_message: result.error,
              retry_count: retryCount + 1,
              scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min delay
            } as never)
            .eq('id', notification.id)
        }

        failed++
      }
    } catch (error) {
      console.error('Error processing notification:', notification.id, error)
      failed++
    }
  }

  return { processed, failed }
}

/**
 * Send a single notification
 */
async function sendNotification(notification: QueuedNotification): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get recipient contact info
  let email: string | null = null
  let phone: string | null = null
  let recipientName: string = ''

  type RecipientData = { email: string | null; phone: string | null; full_name: string }

  if (notification.recipient_type === 'parent') {
    const { data: parentData } = await supabase
      .from('parents')
      .select('email, phone, full_name')
      .eq('id', notification.recipient_id)
      .single()

    const parent = parentData as RecipientData | null
    if (parent) {
      email = parent.email
      phone = parent.phone
      recipientName = parent.full_name
    }
  } else if (notification.recipient_type === 'student') {
    const { data: studentData } = await supabase
      .from('students')
      .select('email, phone, full_name')
      .eq('id', notification.recipient_id)
      .single()

    const student = studentData as RecipientData | null
    if (student) {
      email = student.email
      phone = student.phone
      recipientName = student.full_name
    }
  } else if (notification.recipient_type === 'teacher') {
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('email, phone, full_name')
      .eq('id', notification.recipient_id)
      .single()

    const teacher = teacherData as RecipientData | null
    if (teacher) {
      email = teacher.email
      phone = teacher.phone
      recipientName = teacher.full_name
    }
  }

  const results: { channel: string; success: boolean; error?: string }[] = []

  // Send SMS
  if ((notification.channel === 'sms' || notification.channel === 'both') && phone) {
    try {
      const smsResult = await sendSMS(phone, notification.message)
      results.push({ channel: 'sms', success: smsResult.success, error: smsResult.error })

      // Log the SMS
      await logNotification({
        supabase,
        notificationId: notification.id,
        centerId: notification.center_id,
        channel: 'sms',
        recipientAddress: phone,
        status: smsResult.success ? 'sent' : 'failed',
        provider: 'twilio',
        providerMessageId: smsResult.messageId,
        providerResponse: smsResult.error,
      })
    } catch (error) {
      results.push({ channel: 'sms', success: false, error: String(error) })
    }
  }

  // Send Email
  if ((notification.channel === 'email' || notification.channel === 'both') && email) {
    try {
      // Build HTML email
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E40AF;">${notification.title}</h2>
          <p>Dear ${recipientName},</p>
          <div style="white-space: pre-line;">${notification.message}</div>
        </div>
      `
      const emailResult = await sendEmail(email, notification.title, html)
      results.push({ channel: 'email', success: emailResult.success, error: emailResult.error })

      // Log the email
      await logNotification({
        supabase,
        notificationId: notification.id,
        centerId: notification.center_id,
        channel: 'email',
        recipientAddress: email,
        status: emailResult.success ? 'sent' : 'failed',
        provider: 'sendgrid',
        providerMessageId: emailResult.messageId,
        providerResponse: emailResult.error,
      })
    } catch (error) {
      results.push({ channel: 'email', success: false, error: String(error) })
    }
  }

  // Check if at least one channel succeeded
  const anySuccess = results.some(r => r.success)
  const errors = results.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join('; ')

  return { success: anySuccess, error: anySuccess ? undefined : errors }
}

/**
 * Log notification delivery
 */
async function logNotification({
  supabase,
  notificationId,
  centerId,
  channel,
  recipientAddress,
  status,
  provider,
  providerMessageId,
  providerResponse,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  notificationId: string
  centerId: string
  channel: string
  recipientAddress: string
  status: string
  provider: string
  providerMessageId?: string
  providerResponse?: string
}) {
  await supabase
    .from('notification_logs')
    .insert({
      notification_id: notificationId,
      center_id: centerId,
      channel,
      recipient_address: recipientAddress,
      status,
      provider,
      provider_message_id: providerMessageId,
      provider_response: providerResponse,
    } as never)
}

/**
 * Queue attendance notification for a student's parents
 */
export async function queueAttendanceNotification(
  studentId: string,
  status: 'absent' | 'late',
  date: Date
): Promise<void> {
  const supabase = await createClient()

  // Get student and center info
  const { data: studentData } = await supabase
    .from('students')
    .select(`
      id, full_name, center_id,
      center:tutorial_centers(name)
    `)
    .eq('id', studentId)
    .single()

  type StudentWithCenter = { id: string; full_name: string; center_id: string; center: { name: string } }
  const student = studentData as StudentWithCenter | null
  if (!student) return

  const center = student.center

  // Get parents who want immediate notifications
  const { data: parentLinksData } = await supabase
    .from('parent_students')
    .select(`
      parent:parents(
        id, full_name, phone, email,
        notification_attendance, notification_sms, notification_email
      )
    `)
    .eq('student_id', studentId)
    .not('verified_at', 'is', null)
    .eq('can_receive_notifications', true)

  type ParentLink = { parent: { id: string; full_name: string; notification_attendance: string; notification_sms: boolean; notification_email: boolean } }
  const parentLinks = parentLinksData as ParentLink[] | null
  if (!parentLinks) return

  const dateStr = date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  for (const link of parentLinks) {
    const parent = link.parent

    if (!parent || parent.notification_attendance !== 'immediate') continue

    let channel: 'email' | 'sms' | 'both' = 'both'
    if (parent.notification_sms && !parent.notification_email) channel = 'sms'
    if (!parent.notification_sms && parent.notification_email) channel = 'email'
    if (!parent.notification_sms && !parent.notification_email) continue

    await queueNotification({
      centerId: student.center_id,
      recipientType: 'parent',
      recipientId: parent.id,
      notificationType: status === 'absent' ? 'attendance_absent' : 'attendance_late',
      title: `${center.name} - Attendance Alert`,
      message: `${student.full_name} was marked ${status} on ${dateStr}. If you believe this is an error, please contact the school.`,
      channel,
      relatedEntityType: 'student',
      relatedEntityId: studentId,
    })
  }
}

/**
 * Queue report card notification
 */
export async function queueReportCardNotification(
  studentId: string,
  reportCardId: string,
  term: string
): Promise<void> {
  const supabase = await createClient()

  // Get student and center info
  const { data: studentData2 } = await supabase
    .from('students')
    .select(`
      id, full_name, center_id,
      center:tutorial_centers(name)
    `)
    .eq('id', studentId)
    .single()

  type StudentWithCenter2 = { id: string; full_name: string; center_id: string; center: { name: string } }
  const student = studentData2 as StudentWithCenter2 | null
  if (!student) return

  const center = student.center

  // Get parents who want grade notifications
  const { data: parentLinksData2 } = await supabase
    .from('parent_students')
    .select(`
      parent:parents(
        id, full_name,
        notification_grades, notification_sms, notification_email
      )
    `)
    .eq('student_id', studentId)
    .not('verified_at', 'is', null)
    .eq('can_receive_notifications', true)

  type ParentLink2 = { parent: { id: string; notification_grades: boolean; notification_sms: boolean; notification_email: boolean } }
  const parentLinks = parentLinksData2 as ParentLink2[] | null
  if (!parentLinks) return

  for (const link of parentLinks) {
    const parent = link.parent

    if (!parent || !parent.notification_grades) continue

    let channel: 'email' | 'sms' | 'both' = 'both'
    if (parent.notification_sms && !parent.notification_email) channel = 'sms'
    if (!parent.notification_sms && parent.notification_email) channel = 'email'
    if (!parent.notification_sms && !parent.notification_email) continue

    await queueNotification({
      centerId: student.center_id,
      recipientType: 'parent',
      recipientId: parent.id,
      notificationType: 'report_card_published',
      title: `${center.name} - Report Card Available`,
      message: `The report card for ${student.full_name} for ${term} has been published. You can view it by logging into the parent portal.`,
      channel,
      relatedEntityType: 'report_card',
      relatedEntityId: reportCardId,
    })
  }
}
