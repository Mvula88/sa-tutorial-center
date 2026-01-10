'use client'

import Link from 'next/link'
import {
  GraduationCap,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Clock,
  Check,
  ArrowRight,
  Building2,
  Smartphone,
  Globe,
  Mail,
  Phone
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Student Management',
    description: 'Track student registrations, attendance, grades, and parent information all in one place.',
  },
  {
    icon: CreditCard,
    title: 'Fee & Payment Tracking',
    description: 'Manage monthly fees, track payments, generate receipts, and identify outstanding balances.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Get insights into your centre performance with detailed financial and student reports.',
  },
  {
    icon: GraduationCap,
    title: 'Subject Management',
    description: 'Organize subjects, assign teachers, and manage curriculum with ease.',
  },
  {
    icon: Shield,
    title: 'POPIA Compliant',
    description: 'Your data is protected with industry-standard security and POPIA compliance.',
  },
  {
    icon: Clock,
    title: 'Save Hours Weekly',
    description: 'Automate administrative tasks and focus on what matters most - teaching.',
  },
]

const plans = [
  {
    name: 'Micro',
    description: 'Individual tutors & township operators',
    monthlyPrice: 99,
    setupFee: 0,
    students: 'Up to 15 students',
    features: [
      'Student management',
      'Fee tracking',
      'Payment recording',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Starter',
    description: 'Small tutorial centres',
    monthlyPrice: 199,
    setupFee: 0,
    students: 'Up to 50 students',
    features: [
      'Everything in Micro',
      'Basic reports',
      'Priority email support',
    ],
    highlighted: false,
  },
  {
    name: 'Standard',
    description: 'Growing tutorial centres',
    monthlyPrice: 399,
    setupFee: 0,
    students: '50-150 students',
    features: [
      'Everything in Starter',
      'Multiple staff accounts',
      'Advanced reports',
      'Library module',
      'SMS notifications',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'Premium',
    description: 'Large centres & academies',
    monthlyPrice: 599,
    setupFee: 0,
    students: 'Unlimited students',
    features: [
      'Everything in Standard',
      'Hostel management',
      'Transport tracking',
      'Custom branding',
      'Dedicated support',
      'API access',
    ],
    highlighted: false,
  },
]

const testimonials = [
  {
    name: 'Thabo Molefe',
    role: 'Owner, Soweto Learning Hub',
    quote: 'This system has transformed how we manage our tutorial centre. No more spreadsheets!',
  },
  {
    name: 'Nomsa Dlamini',
    role: 'Administrator, Cape Town Tutors',
    quote: 'The fee tracking alone saves us hours every month. Highly recommended.',
  },
  {
    name: 'David van der Berg',
    role: 'Director, Pretoria Academy',
    quote: 'Finally, a system built for tutorial centres, not complicated school ERPs.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SA Tutorial Centres</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Building2 className="w-4 h-4" />
            Built for South African Tutorial Centres
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Simple School Management<br />
            <span className="text-blue-600">For Tutorial Centres</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Stop using spreadsheets and WhatsApp. Manage students, fees, and payments
            with software designed specifically for tutorial centres.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:border-gray-300 transition-colors"
            >
              View Pricing
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">60%</div>
              <div className="text-gray-400 mt-1">of centres still use Excel</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">10+</div>
              <div className="text-gray-400 mt-1">hours saved per week</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">R99</div>
              <div className="text-gray-400 mt-1">starting price per month</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">100%</div>
              <div className="text-gray-400 mt-1">POPIA compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Centre
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Purpose-built features for tutorial centres, not bloated enterprise software.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your centre. All prices in South African Rand.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 bg-white rounded-2xl ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 shadow-xl scale-105'
                    : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500 mt-1">{plan.description}</p>
                </div>
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-bold text-gray-900">R</span>
                    <span className="text-5xl font-bold text-gray-900">{plan.monthlyPrice}</span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  {plan.setupFee > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      + R{plan.setupFee.toLocaleString()} once-off setup fee
                    </p>
                  )}
                  <p className="text-sm text-blue-600 font-medium mt-2">{plan.students}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full py-3 px-4 text-center rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-600">
              Need a custom plan for multiple centres?{' '}
              <a href="#contact" className="text-blue-600 font-medium hover:underline">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Tutorial Centres
            </h2>
            <p className="text-xl text-gray-600">See what other centre owners are saying</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-6 bg-white rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Simplify Your Centre Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join other tutorial centres across South Africa. Start your free trial today.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600">
              Have questions? We&apos;re here to help.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <a href="mailto:support@satutorialcentres.co.za" className="text-blue-600 hover:underline">
                support@satutorialcentres.co.za
              </a>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <a href="https://wa.me/27000000000" className="text-blue-600 hover:underline">
                +27 00 000 0000
              </a>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Demo</h3>
              <a href="#" className="text-blue-600 hover:underline">
                Book a free demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">SA Tutorial Centres</span>
              </div>
              <p className="text-gray-400">
                Affordable school management software for South African tutorial centres.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><span className="text-gray-400">POPIA Compliant</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2">
                <li><a href="mailto:support@satutorialcentres.co.za" className="text-gray-400 hover:text-white transition-colors">support@satutorialcentres.co.za</a></li>
                <li><span className="text-gray-400">South Africa</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              &copy; {new Date().getFullYear()} SA Tutorial Centres. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
