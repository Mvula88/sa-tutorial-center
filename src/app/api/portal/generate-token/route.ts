import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePortalToken, hashToken } from '@/lib/portal-tokens'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'

interface GenerateTokenRequest {
  entityType: 'student' | 'teacher'
  entityId: string
  expiresInDays?: number
  sendNotification?: boolean
  notificationChannel?: 'sms' | 'email' | 'both'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's center and role
    const { data: userDataRaw } = await supabase
      .from('users')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    const userData = userDataRaw as { center_id: string | null; role: string } | null
    if (!userData?.center_id) {
      return NextResponse.json({ error: 'No center associated' }, { status: 400 })
    }

    // Only center admins can generate tokens
    if (!['center_admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body: GenerateTokenRequest = await request.json()
    const { entityType, entityId, expiresInDays = 30, sendNotification = false, notificationChannel = 'both' } = body

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }

    if (!['student', 'teacher'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    // Verify entity exists and belongs to this center
    const table = entityType === 'student' ? 'students' : 'teachers'
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select('id, full_name, phone, email, center_id')
      .eq('id', entityId)
      .eq('center_id', userData.center_id)
      .single()

    if (entityError || !entity) {
      return NextResponse.json({ error: `${entityType} not found` }, { status: 404 })
    }

    // Get center info for notification
    const { data: centerData } = await supabase
      .from('tutorial_centers')
      .select('name')
      .eq('id', userData.center_id)
      .single()

    const center = centerData as { name: string } | null

    // Generate the token
    const token = generatePortalToken(entityType, entityId, userData.center_id, { expiresInDays })
    const tokenHash = hashToken(token)

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Revoke any existing active tokens for this entity
    await supabase
      .from('portal_access_tokens')
      .update({ is_revoked: true } as never)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_revoked', false)

    // Store the token hash in database
    const { error: insertError } = await supabase
      .from('portal_access_tokens')
      .insert({
        center_id: userData.center_id,
        entity_type: entityType,
        entity_id: entityId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        created_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      } as never)

    if (insertError) {
      console.error('Error storing token:', insertError)
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }

    // Build portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const portalUrl = `${baseUrl}/${entityType}/${token}`

    // Send notification if requested
    if (sendNotification && center) {
      const entityData = entity as { full_name: string; phone?: string; email?: string }
      const message = `${center.name}: Your portal access link is ready. Click here to access: ${portalUrl}`

      if ((notificationChannel === 'sms' || notificationChannel === 'both') && entityData.phone) {
        await sendSMS(entityData.phone, message)
      }

      if ((notificationChannel === 'email' || notificationChannel === 'both') && entityData.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1E40AF;">Portal Access Link</h2>
            <p>Hello ${entityData.full_name},</p>
            <p>Your portal access link for ${center.name} is ready:</p>
            <p style="margin: 20px 0;">
              <a href="${portalUrl}" style="background: #1E40AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Access Portal
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in ${expiresInDays} days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this link, please ignore this email.</p>
          </div>
        `
        await sendEmail(entityData.email, `${center.name} - Portal Access Link`, html)
      }
    }

    return NextResponse.json({
      success: true,
      token,
      portalUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInDays,
    })
  } catch (error) {
    console.error('Generate token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
