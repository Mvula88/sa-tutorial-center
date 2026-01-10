/**
 * Audit Logging Utility
 * Tracks all CRUD operations for compliance and debugging
 */

import { createClient } from '@/lib/supabase/client'

export type AuditAction = 'create' | 'update' | 'delete'

export type AuditEntityType =
  | 'student'
  | 'teacher'
  | 'payment'
  | 'user'
  | 'subject'
  | 'fee'
  | 'hostel_block'
  | 'hostel_room'
  | 'hostel_allocation'
  | 'vehicle'
  | 'transport_route'
  | 'book'
  | 'book_borrowing'
  | 'center'

export interface AuditLogEntry {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  userId: string
  centerId: string
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogRecord {
  id: string
  center_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase.from('audit_logs').insert({
      center_id: entry.centerId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      old_values: entry.oldValues || null,
      new_values: entry.newValues || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    } as never)

    if (error) {
      console.error('Error creating audit log:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception creating audit log:', error)
    return { success: false, error: 'Failed to create audit log' }
  }
}

/**
 * Get audit logs for a center with pagination
 */
export async function getAuditLogs(
  centerId: string,
  options: {
    page?: number
    limit?: number
    action?: AuditAction
    entityType?: AuditEntityType
    userId?: string
    startDate?: string
    endDate?: string
  } = {}
): Promise<{
  data: AuditLogRecord[]
  total: number
  page: number
  totalPages: number
}> {
  const supabase = createClient()
  const { page = 1, limit = 20, action, entityType, userId, startDate, endDate } = options

  let query = supabase
    .from('audit_logs')
    .select(
      `
      *,
      user:users(full_name, email)
    `,
      { count: 'exact' }
    )
    .eq('center_id', centerId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (action) {
    query = query.eq('action', action)
  }
  if (entityType) {
    query = query.eq('entity_type', entityType)
  }
  if (userId) {
    query = query.eq('user_id', userId)
  }
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  // Apply pagination
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching audit logs:', error)
    return { data: [], total: 0, page, totalPages: 0 }
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: (data || []) as unknown as AuditLogRecord[],
    total,
    page,
    totalPages,
  }
}

/**
 * Get all audit logs (for super admin)
 */
export async function getAllAuditLogs(
  options: {
    page?: number
    limit?: number
    action?: AuditAction
    entityType?: AuditEntityType
    centerId?: string
    startDate?: string
    endDate?: string
  } = {}
): Promise<{
  data: (AuditLogRecord & { center?: { name: string } })[]
  total: number
  page: number
  totalPages: number
}> {
  const supabase = createClient()
  const { page = 1, limit = 20, action, entityType, centerId, startDate, endDate } = options

  let query = supabase
    .from('audit_logs')
    .select(
      `
      *,
      user:users(full_name, email),
      center:tutorial_centers(name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  // Apply filters
  if (action) {
    query = query.eq('action', action)
  }
  if (entityType) {
    query = query.eq('entity_type', entityType)
  }
  if (centerId) {
    query = query.eq('center_id', centerId)
  }
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  // Apply pagination
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching all audit logs:', error)
    return { data: [], total: 0, page, totalPages: 0 }
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return {
    data: (data || []) as unknown as (AuditLogRecord & { center?: { name: string } })[],
    total,
    page,
    totalPages,
  }
}

/**
 * Helper to format audit action for display
 */
export function formatAuditAction(action: AuditAction): string {
  const actionLabels: Record<AuditAction, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
  }
  return actionLabels[action] || action
}

/**
 * Helper to format entity type for display
 */
export function formatEntityType(entityType: AuditEntityType): string {
  const entityLabels: Record<AuditEntityType, string> = {
    student: 'Student',
    teacher: 'Teacher',
    payment: 'Payment',
    user: 'User',
    subject: 'Subject',
    fee: 'Fee',
    hostel_block: 'Hostel Block',
    hostel_room: 'Hostel Room',
    hostel_allocation: 'Room Allocation',
    vehicle: 'Vehicle',
    transport_route: 'Transport Route',
    book: 'Book',
    book_borrowing: 'Book Borrowing',
    center: 'Center',
  }
  return entityLabels[entityType] || entityType
}

/**
 * Get action badge color
 */
export function getActionColor(action: AuditAction): string {
  const colors: Record<AuditAction, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
  }
  return colors[action] || 'bg-gray-100 text-gray-700'
}

/**
 * Calculate the diff between old and new values
 */
export function calculateDiff(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

  if (!oldValues && !newValues) return changes

  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ])

  for (const key of allKeys) {
    const oldVal = oldValues?.[key]
    const newVal = newValues?.[key]

    // Skip internal fields
    if (['id', 'created_at', 'updated_at', 'center_id'].includes(key)) continue

    // Check if values are different
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  }

  return changes
}
