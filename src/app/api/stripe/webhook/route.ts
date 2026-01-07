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
  const plan = session.metadata?.plan
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!centerId) {
    console.error('No centerId in checkout session metadata')
    return
  }

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

  // Record the payment in subscription_payments table
  const { error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({
      center_id: center.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents to rands
      currency: invoice.currency || 'zar',
      status: 'succeeded',
      payment_date: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()).toISOString(),
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    })

  if (paymentError) {
    console.error('Failed to record subscription payment:', paymentError)
  } else {
    console.log(`Payment recorded for center ${center.id}, amount: R${invoice.amount_paid / 100}`)
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
