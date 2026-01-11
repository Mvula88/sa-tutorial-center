import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSMSCreditCheckoutSession, SMSCreditPackage, SMS_CREDIT_PACKAGES } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with center info
    const { data: profile } = await supabase
      .from('users')
      .select(`
        id,
        email,
        center_id,
        center:tutorial_centers(
          id,
          name,
          email
        )
      `)
      .eq('id', user.id)
      .single()

    interface UserProfile {
      id: string
      email: string
      center_id: string | null
      center: { id: string; name: string; email: string | null } | null
    }

    const typedProfile = profile as UserProfile | null

    if (!typedProfile?.center_id) {
      return NextResponse.json(
        { error: 'No center associated with user' },
        { status: 400 }
      )
    }

    const { packageType } = await request.json()

    if (!packageType || !Object.keys(SMS_CREDIT_PACKAGES).includes(packageType)) {
      return NextResponse.json(
        { error: 'Invalid SMS credit package' },
        { status: 400 }
      )
    }

    const center = typedProfile.center!
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await createSMSCreditCheckoutSession({
      centerId: typedProfile.center_id,
      centerEmail: center.email || typedProfile.email,
      centerName: center.name,
      packageType: packageType as SMSCreditPackage,
      successUrl: `${baseUrl}/dashboard/sms?credits=success`,
      cancelUrl: `${baseUrl}/dashboard/sms?credits=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('SMS credit checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
