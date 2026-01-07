import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client with service role for admin operations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type UserRole = 'super_admin' | 'center_admin' | 'center_staff'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  center_id: string | null
  is_active: boolean
}

export interface AuthResult {
  user: AuthenticatedUser | null
  error: string | null
}

/**
 * Verify the authenticated user from the request
 * Returns user data if authenticated, null otherwise
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Get the auth token from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    const refreshToken = cookieStore.get('sb-refresh-token')?.value

    // Also check Authorization header
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')

    const token = accessToken || bearerToken

    if (!token) {
      return { user: null, error: 'No authentication token provided' }
    }

    // Verify the token and get user
    const { data: { user: authUser }, error: authError } = await adminSupabase.auth.getUser(token)

    if (authError || !authUser) {
      return { user: null, error: 'Invalid or expired token' }
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .select('id, email, role, center_id, is_active')
      .eq('id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      return { user: null, error: 'User profile not found' }
    }

    if (!userProfile.is_active) {
      return { user: null, error: 'User account is deactivated' }
    }

    return {
      user: userProfile as AuthenticatedUser,
      error: null,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { user: null, error: 'Authentication verification failed' }
  }
}

/**
 * Middleware to require authentication for API routes
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const { user, error } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    )
  }

  return { user }
}

/**
 * Middleware to require specific roles
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const authResult = await requireAuth(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  return { user }
}

/**
 * Middleware to require super admin role
 */
export async function requireSuperAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireRole(request, ['super_admin'])
}

/**
 * Middleware to require center admin or higher
 */
export async function requireCenterAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireRole(request, ['super_admin', 'center_admin'])
}

/**
 * Verify user has access to a specific center
 */
export function verifyCenterAccess(user: AuthenticatedUser, centerId: string): boolean {
  // Super admins have access to all centers
  if (user.role === 'super_admin') {
    return true
  }

  // Other users must belong to the center
  return user.center_id === centerId
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}
