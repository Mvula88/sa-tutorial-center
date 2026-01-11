import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { verifyWebhookSignature } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Use service role for webhook handling (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const centerId = session.metadata?.centerId
  const type = session.metadata?.type

  if (!centerId) {
    console.error('No centerId in checkout session metadata')
    return
  }

  // Handle SMS credit purchases (one-time payment)
  if (type === 'sms_credits') {
    await handleSMSCreditPurchase(session)
    return
  }

  // Handle subscription checkout
  const plan = session.metadata?.plan
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Update center with Stripe customer and subscription info
  const { error } = await supabase
    .from('tutorial_centers')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_tier: plan || 'starter',
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', centerId)

  if (error) {
    console.error('Failed to update center subscription:', error)
    throw error
  }

  console.log(`Checkout completed for center ${centerId}, plan: ${plan}`)
}

async function handleSMSCreditPurchase(session: Stripe.Checkout.Session) {
  const centerId = session.metadata?.centerId
  const packageType = session.metadata?.package
  const creditsStr = session.metadata?.credits
  const credits = creditsStr ? parseInt(creditsStr, 10) : 0

  if (!centerId || !credits) {
    console.error('Invalid SMS credit purchase metadata')
    return
  }

  // Get current center credits
  const { data: center, error: fetchError } = await supabase
    .from('tutorial_centers')
    .select('sms_credits')
    .eq('id', centerId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch center:', fetchError)
    throw fetchError
  }

  const currentCredits = center?.sms_credits || 0
  const newCredits = currentCredits + credits

  // Update center's SMS credits
  const { error: updateError } = await supabase
    .from('tutorial_centers')
    .update({
      sms_credits: newCredits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', centerId)

  if (updateError) {
    console.error('Failed to update SMS credits:', updateError)
    throw updateError
  }

  // Record the credit transaction
  const { error: txError } = await supabase
    .from('sms_credit_transactions')
    .insert({
      center_id: centerId,
      type: 'purchase',
      amount: credits,
      balance_after: newCredits,
      description: `Purchased ${packageType} package (${credits} credits)`,
      reference_id: session.id,
    })

  if (txError) {
    console.error('Failed to record SMS credit transaction:', txError)
    // Don't throw - credits were added, just logging failed
  }

  console.log(`SMS credits purchased for center ${centerId}: ${credits} credits (package: ${packageType})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const centerId = subscription.metadata?.centerId

  if (!centerId) {
    // Try to find center by customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

    const { data: center } = await supabase
      .from('tutorial_centers')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!center) {
      console.error('No center found for subscription')
      return
    }

    await updateCenterSubscription(center.id, subscription)
  } else {
    await updateCenterSubscription(centerId, subscription)
  }
}

async function updateCenterSubscription(centerId: string, subscription: Stripe.Subscription) {
  const status = mapSubscriptionStatus(subscription.status)

  // Type assertion for subscription properties
  const subscriptionData = subscription as unknown as {
    id: string
    status: string
    metadata?: { plan?: string }
    current_period_end: number
    cancel_at_period_end: boolean
  }

  const { error } = await supabase
    .from('tutorial_centers')
    .update({
      stripe_subscription_id: subscriptionData.id,
      subscription_status: status,
      subscription_tier: subscriptionData.metadata?.plan || 'starter',
      current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscriptionData.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('id', centerId)

  if (error) {
    console.error('Failed to update subscription:', error)
    throw error
  }

  console.log(`Subscription updated for center ${centerId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const { data: center } = await supabase
    .from('tutorial_centers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!center) {
    console.error('No center found for deleted subscription')
    return
  }

  const { error } = await supabase
    .from('tutorial_centers')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', center.id)

  if (error) {
    console.error('Failed to update cancelled subscription:', error)
    throw error
  }

  console.log(`Subscription cancelled for center ${center.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  // Find the center by Stripe customer ID
  const { data: center } = await supabase
    .from('tutorial_centers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!center) {
    console.log(`No center found for customer ${customerId}`)
    return
  }

  // Type assertion for invoice properties
  const inv = invoice as unknown as {
    id: string
    payment_intent: string | null
    amount_paid: number
    currency: string
    status_transitions?: { paid_at?: number }
    period_start?: number
    period_end?: number
  }

  // Record the payment in subscription_payments table
  const { error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({
      center_id: center.id,
      stripe_payment_intent_id: inv.payment_intent as string,
      stripe_invoice_id: inv.id,
      amount: inv.amount_paid / 100, // Convert from cents to rands
      currency: inv.currency || 'zar',
      status: 'succeeded',
      payment_date: new Date(inv.status_transitions?.paid_at ? inv.status_transitions.paid_at * 1000 : Date.now()).toISOString(),
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
    })

  if (paymentError) {
    console.error('Failed to record subscription payment:', paymentError)
  } else {
    console.log(`Payment recorded for center ${center.id}, amount: R${inv.amount_paid / 100}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  const { data: center } = await supabase
    .from('tutorial_centers')
    .select('id, email, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!center) return

  // Update subscription status to past_due
  await supabase
    .from('tutorial_centers')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', center.id)

  console.log(`Payment failed for center ${center.id}`)

  // Could add logic here to send payment failure notification
}

function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'cancelled',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    trialing: 'trialing',
    paused: 'paused',
  }

  return statusMap[stripeStatus] || 'inactive'
}
