import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomerPortalSession } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's center with Stripe customer ID
    const { data: profile } = await supabase
      .from('users')
      .select(`
        center_id,
        center:tutorial_centers(
          stripe_customer_id
        )
      `)
      .eq('id', user.id)
      .single()

    interface UserProfile {
      center_id: string | null
      center: { stripe_customer_id: string | null } | null
    }

    const typedProfile = profile as UserProfile | null

    if (!typedProfile?.center_id) {
      return NextResponse.json(
        { error: 'No center associated with user' },
        { status: 400 }
      )
    }

    const center = typedProfile.center

    if (!center?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createCustomerPortalSession({
      customerId: center.stripe_customer_id,
      returnUrl: `${baseUrl}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}
