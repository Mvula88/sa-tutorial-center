import Stripe from 'stripe'

// Lazy initialize Stripe to avoid build-time errors when env vars not set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return _stripe
}

// Subscription plans configuration - Ultra-aggressive market penetration pricing
export const SUBSCRIPTION_PLANS = {
  micro: {
    name: 'Micro',
    description: 'Individual tutors & township operators',
    priceId: process.env.STRIPE_MICRO_PRICE_ID!,
    monthlyPrice: 99, // R99
    setupFee: 0,
    maxStudents: 15,
    features: [
      'Up to 15 students',
      'Student management',
      'Fee tracking',
      'Payment recording',
      'Email support',
    ],
  },
  starter: {
    name: 'Starter',
    description: 'Small tutorial centres',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    monthlyPrice: 199, // R199
    setupFee: 0,
    maxStudents: 50,
    features: [
      'Up to 50 students',
      'Student management',
      'Fee tracking',
      'Payment recording',
      'Basic reports',
      'Email support',
    ],
  },
  standard: {
    name: 'Standard',
    description: 'Growing tutorial centres',
    priceId: process.env.STRIPE_STANDARD_PRICE_ID!,
    monthlyPrice: 399, // R399
    setupFee: 0,
    maxStudents: 150,
    features: [
      'Everything in Starter',
      'Multiple staff accounts',
      'Advanced reports',
      'SMS notifications',
      'Priority support',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Large centres & academies',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID!,
    monthlyPrice: 599, // R599
    setupFee: 0,
    maxStudents: -1, // Unlimited
    features: [
      'Everything in Standard',
      'Hostel management',
      'Transport tracking',
      'Custom branding',
      'Dedicated support',
      'API access',
    ],
  },
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS

// SMS Credit Packages - One-time purchases
export const SMS_CREDIT_PACKAGES = {
  small: {
    name: '100 SMS Credits',
    credits: 100,
    priceId: process.env.STRIPE_SMS_SMALL_PRICE_ID || '',
    price: 50, // R50 = R0.50 per SMS
  },
  medium: {
    name: '500 SMS Credits',
    credits: 500,
    priceId: process.env.STRIPE_SMS_MEDIUM_PRICE_ID || '',
    price: 200, // R200 = R0.40 per SMS
  },
  large: {
    name: '1000 SMS Credits',
    credits: 1000,
    priceId: process.env.STRIPE_SMS_LARGE_PRICE_ID || '',
    price: 350, // R350 = R0.35 per SMS
  },
  bulk: {
    name: '5000 SMS Credits',
    credits: 5000,
    priceId: process.env.STRIPE_SMS_BULK_PRICE_ID || '',
    price: 1500, // R1500 = R0.30 per SMS
  },
} as const

export type SMSCreditPackage = keyof typeof SMS_CREDIT_PACKAGES

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession({
  centerId,
  centerEmail,
  centerName,
  plan,
  successUrl,
  cancelUrl,
}: {
  centerId: string
  centerEmail: string
  centerName: string
  plan: SubscriptionPlan
  successUrl: string
  cancelUrl: string
}) {
  const planConfig = SUBSCRIPTION_PLANS[plan]

  // Create line items for the subscription
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: planConfig.priceId,
      quantity: 1,
    },
  ]

  // Build session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: centerEmail,
    client_reference_id: centerId,
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      centerId,
      centerName,
      plan,
      setupFee: planConfig.setupFee.toString(), // Store setup fee for webhook to handle
    },
    subscription_data: {
      metadata: {
        centerId,
        plan,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  }

  const session = await getStripe().checkout.sessions.create(sessionParams)

  return session
}

/**
 * Create a Stripe Checkout Session for SMS Credits (one-time payment)
 */
export async function createSMSCreditCheckoutSession({
  centerId,
  centerEmail,
  centerName,
  packageType,
  successUrl,
  cancelUrl,
}: {
  centerId: string
  centerEmail: string
  centerName: string
  packageType: SMSCreditPackage
  successUrl: string
  cancelUrl: string
}) {
  const packageConfig = SMS_CREDIT_PACKAGES[packageType]

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: centerEmail,
    client_reference_id: centerId,
    line_items: [
      {
        price_data: {
          currency: 'zar',
          product_data: {
            name: packageConfig.name,
            description: `${packageConfig.credits} SMS credits for ${centerName}`,
          },
          unit_amount: packageConfig.price * 100, // Convert to cents
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      centerId,
      centerName,
      type: 'sms_credits',
      package: packageType,
      credits: packageConfig.credits.toString(),
    },
  }

  const session = await getStripe().checkout.sessions.create(sessionParams)
  return session
}

/**
 * Create a Stripe Customer Portal Session
 */
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ['customer', 'default_payment_method'],
  })

  return subscription
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  return subscription
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  const subscription = await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })

  return subscription
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  const customers = await getStripe().customers.list({
    email,
    limit: 1,
  })

  return customers.data[0] || null
}

/**
 * Create or get Stripe customer
 */
export async function createOrGetCustomer({
  email,
  name,
  metadata,
}: {
  email: string
  name: string
  metadata?: Record<string, string>
}) {
  // Check if customer already exists
  const existingCustomer = await getCustomerByEmail(email)

  if (existingCustomer) {
    return existingCustomer
  }

  // Create new customer
  const customer = await getStripe().customers.create({
    email,
    name,
    metadata,
  })

  return customer
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
