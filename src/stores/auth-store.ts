import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { UserWithCenter } from '@/types'

interface AuthState {
  user: UserWithCenter | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean

  // Actions
  setUser: (user: UserWithCenter | null) => void
  fetchUser: () => Promise<void>
  signOut: () => Promise<void>
  clearAuth: () => void

  // Role checks
  isSuperAdmin: () => boolean
  isCenterAdmin: () => boolean
  isCenterStaff: () => boolean
  canAccessModule: (module: 'hostel' | 'transport' | 'library' | 'sms') => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      isInitialized: true
    })
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true
    })
  },

  fetchUser: async () => {
    const supabase = createClient()
    const currentUser = get().user

    if (!currentUser?.id) return

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          *,
          center:tutorial_centers (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            secondary_color,
            status,
            hostel_module_enabled,
            transport_module_enabled,
            library_module_enabled,
            sms_module_enabled
          )
        `)
        .eq('id', currentUser.id)
        .single()

      if (!error && profile) {
        set({
          user: profile as UserWithCenter,
          isAuthenticated: true,
        })
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false })
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',
  isCenterAdmin: () => get().user?.role === 'center_admin',
  isCenterStaff: () => get().user?.role === 'center_staff',

  canAccessModule: (module) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (!user.center) return false

    switch (module) {
      case 'hostel':
        return user.center.hostel_module_enabled
      case 'transport':
        return user.center.transport_module_enabled
      case 'library':
        return user.center.library_module_enabled
      case 'sms':
        return user.center.sms_module_enabled
      default:
        return false
    }
  },
}))
