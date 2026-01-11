'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import {
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Calendar,
  CalendarPlus,
  Download,
  X,
  TrendingUp,
  RotateCcw,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  PieChart,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, CURRENCY_CONFIG } from '@/lib/currency'
import { ProcessRefundModal } from '@/components/refunds/process-refund-modal'
import { BulkGenerateFeesModal } from '@/components/fees/bulk-generate-fees-modal'

interface Payment {
  id: string
  amount: number
  payment_method: string | null
  reference_number: string | null
  payment_date: string
  notes: string | null
  student: {
    id: string
    full_name: string
    student_number: string | null
  } | null
  recorded_by_user: {
    full_name: string
  } | null
}

interface FeeSummary {
  totalDue: number
  totalPaid: number
  totalOutstanding: number
  totalCredit: number
  byType: {
    registration: { due: number; paid: number; outstanding: number }
    tuition: { due: number; paid: number; outstanding: number }
  }
  byStatus: {
    paid: number
    partial: number
    unpaid: number
  }
  studentCount: number
}

const ITEMS_PER_PAGE = 10

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  mobile_money: 'Mobile Money',
}

export default function PaymentsPage() {
  const { user, isCenterAdmin } = useAuthStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [bulkGenerateModalOpen, setBulkGenerateModalOpen] = useState(false)
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)
  const [showFeeSummary, setShowFeeSummary] = useState(true)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  useEffect(() => {
    fetchPayments()
    fetchFeeSummary()
  }, [user?.center_id, currentPage, methodFilter, dateFromFilter, dateToFilter, monthFilter, yearFilter])

  async function fetchPayments() {
    if (!user?.center_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          reference_number,
          payment_date,
          notes,
          student:students(id, full_name, student_number),
          recorded_by_user:users!recorded_by(full_name)
        `, { count: 'exact' })
        .eq('center_id', user.center_id)
        .order('payment_date', { ascending: false })

      // Apply filters
      if (methodFilter) {
        query = query.eq('payment_method', methodFilter)
      }

      // Date range filter
      if (dateFromFilter) {
        query = query.gte('payment_date', `${dateFromFilter}T00:00:00`)
      }
      if (dateToFilter) {
        query = query.lte('payment_date', `${dateToFilter}T23:59:59`)
      }

      // Month/Year filter
      if (monthFilter && yearFilter) {
        const startOfMonth = `${yearFilter}-${monthFilter.padStart(2, '0')}-01T00:00:00`
        const lastDay = new Date(parseInt(yearFilter), parseInt(monthFilter), 0).getDate()
        const endOfMonth = `${yearFilter}-${monthFilter.padStart(2, '0')}-${lastDay}T23:59:59`
        query = query.gte('payment_date', startOfMonth).lte('payment_date', endOfMonth)
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      // Filter by search query on client side (student name/number)
      let filteredPayments = (data || []) as Payment[]
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        filteredPayments = filteredPayments.filter(
          (p) =>
            p.student?.full_name.toLowerCase().includes(search) ||
            p.student?.student_number?.toLowerCase().includes(search) ||
            p.reference_number?.toLowerCase().includes(search)
        )
      }

      setPayments(filteredPayments)
      setTotalCount(count || 0)

      // Calculate total amount for filtered results
      const total = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
      setTotalAmount(total)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to fetch payments')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchFeeSummary() {
    if (!user?.center_id) return

    setIsLoadingSummary(true)
    const supabase = createClient()

    try {
      // Fetch all fees for the center
      const { data: feesData, error: feesError } = await supabase
        .from('student_fees')
        .select('fee_type, amount_due, amount_paid, status')
        .eq('center_id', user.center_id)

      if (feesError) throw feesError

      // Fetch total credit balance from students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, credit_balance')
        .eq('center_id', user.center_id)
        .eq('status', 'active')

      if (studentsError) throw studentsError

      // Calculate summary
      const summary: FeeSummary = {
        totalDue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalCredit: 0,
        byType: {
          registration: { due: 0, paid: 0, outstanding: 0 },
          tuition: { due: 0, paid: 0, outstanding: 0 },
        },
        byStatus: {
          paid: 0,
          partial: 0,
          unpaid: 0,
        },
        studentCount: studentsData?.length || 0,
      }

      for (const fee of (feesData || []) as any[]) {
        const due = fee.amount_due || 0
        const paid = fee.amount_paid || 0
        const outstanding = due - paid

        summary.totalDue += due
        summary.totalPaid += paid
        summary.totalOutstanding += outstanding

        // By type
        const feeType = fee.fee_type === 'registration' ? 'registration' : 'tuition'
        summary.byType[feeType].due += due
        summary.byType[feeType].paid += paid
        summary.byType[feeType].outstanding += outstanding

        // By status
        if (fee.status === 'paid') {
          summary.byStatus.paid++
        } else if (fee.status === 'partial') {
          summary.byStatus.partial++
        } else {
          summary.byStatus.unpaid++
        }
      }

      // Total credit balance
      for (const student of (studentsData || []) as any[]) {
        summary.totalCredit += student.credit_balance || 0
      }

      setFeeSummary(summary)
    } catch (error) {
      console.error('Error fetching fee summary:', error)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchPayments()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">View and record student payments</p>
        </div>
        <div className="flex items-center gap-3">
          {isCenterAdmin() && (
            <>
              <Link href="/dashboard/payments/outstanding">
                <Button variant="outline" leftIcon={<AlertCircle className="w-4 h-4" />}>
                  Outstanding Fees
                </Button>
              </Link>
              <Button
                variant="outline"
                leftIcon={<CalendarPlus className="w-4 h-4" />}
                onClick={() => setBulkGenerateModalOpen(true)}
              >
                Generate Fees
              </Button>
              <Link href="/dashboard/payments/refunds">
                <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
                  View Refunds
                </Button>
              </Link>
              <Button
                variant="outline"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setRefundModalOpen(true)}
              >
                Process Refund
              </Button>
            </>
          )}
          <Link href="/dashboard/payments/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Fee Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <button
          onClick={() => setShowFeeSummary(!showFeeSummary)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <PieChart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Fee Summary</h3>
              <p className="text-sm text-gray-500">Overview of all fees across students</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isLoadingSummary && feeSummary && (
              <div className="text-right hidden md:block">
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(feeSummary.totalOutstanding)}</p>
              </div>
            )}
            {showFeeSummary ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {showFeeSummary && (
          <div className="px-6 pb-6 border-t border-gray-100">
            {isLoadingSummary ? (
              <div className="py-8 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-20 bg-gray-100 rounded-lg"></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ) : feeSummary ? (
              <div className="pt-4 space-y-6">
                {/* Main totals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <p className="text-sm text-gray-500">Total Due</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(feeSummary.totalDue)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <p className="text-sm text-gray-500">Total Paid</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(feeSummary.totalPaid)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-gray-500">Outstanding</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(feeSummary.totalOutstanding)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-gray-500">Credit Balance</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(feeSummary.totalCredit)}</p>
                  </div>
                </div>

                {/* Breakdown sections */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* By Fee Type */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">By Fee Type</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Registration Fees</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(feeSummary.byType.registration.paid)} paid of {formatCurrency(feeSummary.byType.registration.due)}
                          </p>
                        </div>
                        <p className={`font-semibold ${feeSummary.byType.registration.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {feeSummary.byType.registration.outstanding > 0
                            ? `-${formatCurrency(feeSummary.byType.registration.outstanding)}`
                            : 'Paid'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Tuition Fees</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(feeSummary.byType.tuition.paid)} paid of {formatCurrency(feeSummary.byType.tuition.due)}
                          </p>
                        </div>
                        <p className={`font-semibold ${feeSummary.byType.tuition.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {feeSummary.byType.tuition.outstanding > 0
                            ? `-${formatCurrency(feeSummary.byType.tuition.outstanding)}`
                            : 'Paid'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* By Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-4">Fee Records by Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <p className="font-medium text-gray-900">Fully Paid</p>
                        </div>
                        <p className="font-semibold text-gray-900">{feeSummary.byStatus.paid}</p>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <p className="font-medium text-gray-900">Partially Paid</p>
                        </div>
                        <p className="font-semibold text-gray-900">{feeSummary.byStatus.partial}</p>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <p className="font-medium text-gray-900">Unpaid</p>
                        </div>
                        <p className="font-semibold text-gray-900">{feeSummary.byStatus.unpaid}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>Active students: <span className="font-medium text-gray-900">{feeSummary.studentCount}</span></p>
                  <p>Collection rate: <span className="font-medium text-gray-900">
                    {feeSummary.totalDue > 0
                      ? `${((feeSummary.totalPaid / feeSummary.totalDue) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span></p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                Unable to load fee summary
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Transactions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Payments (This View)</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Period</p>
              <p className="text-xl font-bold text-gray-900">
                {monthFilter
                  ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(monthFilter) - 1]} ${yearFilter}`
                  : dateFromFilter || dateToFilter
                    ? 'Custom Range'
                    : 'All Time'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Method Filter */}
          <Select
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'card', label: 'Card' },
              { value: 'mobile_money', label: 'Mobile Money' },
            ]}
            placeholder="Method"
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1) }}
            className="w-32"
          />

          {/* Month/Year Quick Filter */}
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-xs text-purple-700 font-medium px-1">Month:</span>
            <Select
              options={[
                { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' }, { value: '3', label: 'Mar' },
                { value: '4', label: 'Apr' }, { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
                { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' }, { value: '9', label: 'Sep' },
                { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
              ]}
              placeholder="All"
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value); setDateFromFilter(''); setDateToFilter(''); setCurrentPage(1) }}
              className="w-20"
            />
            <Select
              options={[
                { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
              ]}
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1) }}
              className="w-20"
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs text-blue-700 font-medium px-1">From:</span>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => { setDateFromFilter(e.target.value); setMonthFilter(''); setCurrentPage(1) }}
              className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
            />
            <span className="text-xs text-blue-700 font-medium px-1">To:</span>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => { setDateToFilter(e.target.value); setMonthFilter(''); setCurrentPage(1) }}
              className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
            />
          </div>

          {/* Clear All */}
          {(methodFilter || dateFromFilter || dateToFilter || monthFilter) && (
            <button
              onClick={() => {
                setMethodFilter(''); setDateFromFilter(''); setDateToFilter(''); setMonthFilter('')
                setCurrentPage(1)
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Active filters tags */}
        {(methodFilter || dateFromFilter || dateToFilter || monthFilter) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {methodFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {PAYMENT_METHODS[methodFilter]}
                <button onClick={() => { setMethodFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {monthFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(monthFilter) - 1]} {yearFilter}
                <button onClick={() => { setMonthFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {dateFromFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                From: {dateFromFilter}
                <button onClick={() => { setDateFromFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {dateToFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                To: {dateToFilter}
                <button onClick={() => { setDateToFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || methodFilter || dateFromFilter || dateToFilter || monthFilter
                ? 'Try adjusting your filters'
                : 'Get started by recording your first payment'}
            </p>
            {!searchQuery && !methodFilter && !dateFromFilter && !dateToFilter && !monthFilter && (
              <Link href="/dashboard/payments/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Record Payment
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recorded By
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">
                            {formatDate(payment.payment_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {payment.student?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.student?.student_number || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {PAYMENT_METHODS[payment.payment_method || ''] || payment.payment_method || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {payment.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {payment.recorded_by_user?.full_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/payments/${payment.id}`}>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} payments
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Refund Modal */}
      <ProcessRefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={() => {
          fetchPayments()
        }}
      />

      {/* Bulk Generate Fees Modal */}
      <BulkGenerateFeesModal
        isOpen={bulkGenerateModalOpen}
        onClose={() => setBulkGenerateModalOpen(false)}
        onSuccess={() => {
          // Optionally refresh something here
        }}
      />
    </div>
  )
}
