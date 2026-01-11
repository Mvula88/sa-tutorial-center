'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
  Phone,
  BookOpen,
  Home,
  Bus,
  Library,
  FileText,
  Settings,
  Sparkles,
  Gift,
  UserCog,
  Lock,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Student Records',
    description: 'Keep all your student info in one place. Contact details, grades, parent info - no more digging through folders or WhatsApp messages.',
  },
  {
    icon: CreditCard,
    title: 'Fee Collection',
    description: 'Know exactly who has paid, who owes, and how much. Print receipts on the spot. No more awkward "did you pay?" conversations.',
  },
  {
    icon: BarChart3,
    title: 'Monthly Reports',
    description: 'See how your centre is doing at a glance. Which subjects are popular, monthly revenue, outstanding fees - all in plain numbers.',
  },
  {
    icon: GraduationCap,
    title: 'Class Organisation',
    description: 'Manage your subjects, assign teachers, and keep track of who teaches what. Works for one teacher or twenty.',
  },
  {
    icon: Shield,
    title: 'Your Data Stays Safe',
    description: 'We take POPIA seriously. Student information is protected and you control who sees what.',
  },
  {
    icon: Clock,
    title: 'Less Admin Work',
    description: 'Stop spending evenings on spreadsheets. The boring stuff gets done faster so you can focus on actual teaching.',
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

// Intersection Observer hook for animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

export default function LandingPage() {
  const heroRef = useInView(0.1)
  const dashboardRef = useInView(0.2)
  const featuresRef = useInView(0.1)
  const pricingRef = useInView(0.1)
  const testimonialsRef = useInView(0.1)
  const ctaRef = useInView(0.3)


  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 6s ease-in-out infinite 2s; }
        .animate-float-slow { animation: float 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
        }
        .animate-slide-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }
        .animate-slide-right {
          animation: slide-in-right 0.8s ease-out forwards;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        .animate-rotate-slow {
          animation: rotate-slow 20s linear infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .opacity-0 { opacity: 0; }
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .glow-blue {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
        }
        .glow-purple {
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
        }
        .text-gradient {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-x 3s ease infinite;
        }
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .hover-glow:hover {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
        }
        .grid-pattern {
          background-image:
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SA Tutorial Centres</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
              <Link
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 hover:scale-105"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 via-white to-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 grid-pattern opacity-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float-slow"></div>

        {/* Floating geometric shapes */}
        <div className="absolute top-32 right-20 w-4 h-4 bg-blue-500 rounded-full animate-bounce-subtle opacity-60"></div>
        <div className="absolute top-60 left-20 w-3 h-3 bg-purple-500 rounded-full animate-bounce-subtle delay-300 opacity-60"></div>
        <div className="absolute bottom-40 right-40 w-2 h-2 bg-pink-500 rounded-full animate-bounce-subtle delay-500 opacity-60"></div>

        <div
          ref={heroRef.ref}
          className={`max-w-7xl mx-auto text-center relative z-10 ${heroRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
        >
          <p className="text-blue-600 font-medium mb-6 tracking-wide uppercase text-sm">
            Proudly South African
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Simple School Management<br />
            <span className="text-gradient">For Tutorial Centres</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 animate-fade-in delay-200">
            Stop using spreadsheets and WhatsApp. Manage students, fees, and payments
            with software designed specifically for tutorial centres.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-blue-500/30 hover:scale-105 group animate-pulse-glow"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 backdrop-blur-sm"
            >
              View Pricing
            </a>
          </div>
          <p className="text-sm text-gray-500 mt-4 animate-fade-in delay-400">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white -mt-8 relative">
        <div
          ref={dashboardRef.ref}
          className={`max-w-6xl mx-auto ${dashboardRef.isInView ? 'animate-scale-in' : 'opacity-0'}`}
        >
          <div className="relative group">
            {/* Glow effect behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>

            {/* Browser mockup frame */}
            <div className="relative bg-gray-800 rounded-t-xl p-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-sm flex items-center gap-2">
                  <Lock className="w-3 h-3 text-green-400" />
                  <span className="animate-shimmer bg-clip-text">app.satutorialcentres.co.za/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="relative bg-gray-100 rounded-b-xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="flex">
                {/* Sidebar */}
                <div className="w-56 bg-white border-r border-gray-200 p-3 hidden md:block">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">My Tutorial Centre</span>
                  </div>
                  <nav className="space-y-0.5">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium shadow-md">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Dashboard
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Students
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Users className="w-3.5 h-3.5" />
                      Teachers
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <UserCog className="w-3.5 h-3.5" />
                      Staff
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <BookOpen className="w-3.5 h-3.5" />
                      Subjects
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <CreditCard className="w-3.5 h-3.5" />
                      Payments
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 rounded-lg text-xs">
                      <Home className="w-3.5 h-3.5" />
                      Hostel
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 rounded-lg text-xs">
                      <Bus className="w-3.5 h-3.5" />
                      Transport
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Library className="w-3.5 h-3.5" />
                      Library
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                      Subscription
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <FileText className="w-3.5 h-3.5" />
                      Reports
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Gift className="w-3.5 h-3.5" />
                      Referrals
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </div>
                  </nav>
                </div>

                {/* Main content */}
                <div className="flex-1 p-4 md:p-6 bg-gray-50">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Total Students</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">247</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        +12 this month
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Revenue (Jan)</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">R48,500</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        +8% vs Dec
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Outstanding</p>
                      <p className="text-xl md:text-2xl font-bold text-orange-600">R12,300</p>
                      <p className="text-xs text-gray-500">23 students</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow hover:-translate-y-0.5 transform duration-200">
                      <p className="text-xs text-gray-500">Active Subjects</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">8</p>
                      <p className="text-xs text-gray-500">Maths most popular</p>
                    </div>
                  </div>

                  {/* Recent payments table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">Recent Payments</h3>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Student</th>
                            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Date</th>
                            <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Amount</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">Thabo Molefe</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Today, 10:30</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">R450.00</td>
                            <td className="px-4 py-2 text-center hidden sm:table-cell"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs animate-pulse">Paid</span></td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">Nomsa Dlamini</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Today, 09:15</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">R300.00</td>
                            <td className="px-4 py-2 text-center hidden sm:table-cell"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Paid</span></td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-gray-900">Sipho Ndlovu</td>
                            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Yesterday</td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">R600.00</td>
                            <td className="px-4 py-2 text-center hidden sm:table-cell"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Paid</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements for visual appeal */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full opacity-20 blur-2xl animate-float"></div>
            <div className="absolute -top-4 -left-4 w-40 h-40 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full opacity-15 blur-2xl animate-float-delayed"></div>
          </div>

          <p className="text-center text-gray-500 mt-8 text-sm">
            See exactly what your centre management dashboard will look like
          </p>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Background image - African students in classroom */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1920&q=80')`,
          }}
        ></div>

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gray-900/85"></div>

        {/* Educational silhouettes - subtle decorative elements */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          {/* Stacked books - bottom left */}
          <svg className="absolute bottom-0 left-0 w-64 h-64 text-white" viewBox="0 0 100 100" fill="currentColor">
            <rect x="10" y="60" width="25" height="35" rx="2" />
            <rect x="20" y="55" width="25" height="40" rx="2" />
            <rect x="30" y="50" width="25" height="45" rx="2" />
          </svg>
          {/* Star - top right */}
          <svg className="absolute top-10 right-10 w-32 h-32 text-white transform rotate-12" viewBox="0 0 100 100" fill="currentColor">
            <polygon points="50,5 55,35 85,35 60,55 70,85 50,65 30,85 40,55 15,35 45,35" />
          </svg>
          {/* Open book with text - bottom right */}
          <svg className="absolute bottom-10 right-10 w-56 h-56 text-white" viewBox="0 0 100 100" fill="currentColor">
            <path d="M20,80 L20,30 L80,30 L80,80 Z M25,35 L25,75 L75,75 L75,35 Z" />
            <rect x="30" y="42" width="40" height="3" />
            <rect x="30" y="50" width="35" height="3" />
            <rect x="30" y="58" width="40" height="3" />
            <rect x="30" y="66" width="25" height="3" />
          </svg>
        </div>

        {/* Subtle SA flag accent at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-600 via-yellow-500 to-red-600"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Running a tutorial centre is hard enough
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mx-auto">
            You shouldn&apos;t have to spend your evenings chasing payments, updating spreadsheets, or trying to remember which parent you need to call back. We built this because we saw too many dedicated educators drowning in admin work instead of doing what they do best - teaching.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm">
            <span className="text-white font-medium">From R99/month</span>
            <span className="text-gray-500">•</span>
            <span className="text-white font-medium">No setup fees</span>
            <span className="text-gray-500">•</span>
            <span className="text-white font-medium">Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 grid-pattern opacity-30"></div>

        <div ref={featuresRef.ref} className="max-w-7xl mx-auto relative z-10">
          <div className={`text-center mb-16 ${featuresRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What you can do with it
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The basics, done properly. Nothing fancy, just the tools you actually need.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 bg-white rounded-2xl border border-gray-100 hover-lift hover-glow group cursor-default ${
                  featuresRef.isInView ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg group-hover:shadow-blue-200">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>

        <div ref={pricingRef.ref} className="max-w-7xl mx-auto relative z-10">
          <div className={`text-center mb-16 ${pricingRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
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
                className={`relative p-8 bg-white rounded-2xl hover-lift transition-all duration-300 ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 shadow-xl scale-105 glow-blue'
                    : 'border border-gray-200 hover:border-blue-200'
                } ${pricingRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-full shadow-lg animate-bounce-subtle">
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
                    <span className="text-5xl font-bold text-gradient">{plan.monthlyPrice}</span>
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
                    <li key={featureIndex} className="flex items-center gap-3 group">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-gray-600 group-hover:text-gray-900 transition-colors">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full py-3 px-4 text-center rounded-xl font-semibold transition-all duration-300 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/30 hover:scale-105'
                      : 'bg-gray-100 text-gray-900 hover:bg-blue-50 hover:text-blue-600'
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
              <a href="#contact" className="text-blue-600 font-medium hover:underline hover:text-blue-700 transition-colors">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30"></div>

        <div ref={testimonialsRef.ref} className="max-w-7xl mx-auto relative z-10">
          <div className={`text-center mb-16 ${testimonialsRef.isInView ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Tutorial Centres
            </h2>
            <p className="text-xl text-gray-600">See what other centre owners are saying</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`p-6 bg-white rounded-2xl border border-gray-100 hover-lift group ${
                  testimonialsRef.isInView ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform"
                      style={{ transitionDelay: `${i * 50}ms` }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
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
      <section
        ref={ctaRef.ref}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)'
          }}></div>
        </div>
        <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full animate-float"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 border border-white/10 rounded-full animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/20 rounded-full animate-bounce-subtle"></div>
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-white/20 rounded-full animate-bounce-subtle delay-300"></div>

        <div className={`max-w-4xl mx-auto text-center relative z-10 ${ctaRef.isInView ? 'animate-scale-in' : 'opacity-0'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Simplify Your Centre Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join other tutorial centres across South Africa. Start your free trial today.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 group"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
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
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 hover-lift hover-glow group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <a href="mailto:support@satutorialcentres.co.za" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                support@satutorialcentres.co.za
              </a>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 hover-lift hover-glow group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <a href="https://wa.me/27000000000" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                +27 00 000 0000
              </a>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 hover-lift hover-glow group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Demo</h3>
              <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                Book a free demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
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
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block">Pricing</a></li>
                <li><Link href="/login" className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block">Terms of Service</Link></li>
                <li><span className="text-gray-400 flex items-center gap-1"><Shield className="w-3 h-3" /> POPIA Compliant</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2">
                <li><a href="mailto:support@satutorialcentres.co.za" className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block">support@satutorialcentres.co.za</a></li>
                <li><span className="text-gray-400 flex items-center gap-1"><Globe className="w-3 h-3" /> South Africa</span></li>
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
