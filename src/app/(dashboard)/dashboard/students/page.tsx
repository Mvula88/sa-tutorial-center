'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  SlidersHorizontal,
  AlertTriangle,
  TrendingUp,
  Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { checkStudentLimit, formatLimit, type StudentLimitCheck } from '@/lib/subscription-limits'

interface Student {
  id: string
  student_number: string | null
  full_name: string
  email: string | null
  phone: string | null
  gender: string | null
  grade: string | null
  status: string
  registration_date: string
  parent_name: string | null
  parent_phone: string | null
}

interface Subject {
  id: string
  name: string
  code: string | null
}

const ITEMS_PER_PAGE = 10

export default function StudentsPage() {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [paymentMonthFilter, setPaymentMonthFilter] = useState('')
  const [paymentYearFilter, setPaymentYearFilter] = useState(new Date().getFullYear().toString())
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Student limit state
  const [studentLimit, setStudentLimit] = useState<StudentLimitCheck | null>(null)

  useEffect(() => {
    fetchSubjects()
    fetchGrades()
    fetchStudentLimit()
  }, [user?.center_id])

  async function fetchStudentLimit() {
    if (!user?.center_id) return
    const limit = await checkStudentLimit(user.center_id)
    setStudentLimit(limit)
  }

  useEffect(() => {
    fetchStudents()
  }, [user?.center_id, currentPage, statusFilter, genderFilter, gradeFilter, subjectFilter, paymentStatusFilter, paymentMonthFilter, paymentYearFilter])

  async function fetchSubjects() {
    if (!user?.center_id) return
    const supabase = createClient()

    const { data } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('center_id', user.center_id)
      .eq('is_active', true)
      .order('name')

    setSubjects(data || [])
  }

  async function fetchGrades() {
    if (!user?.center_id) return
    const supabase = createClient()

    const { data } = await supabase
      .from('students')
      .select('grade')
      .eq('center_id', user.center_id)
      .not('grade', 'is', null)

    // Extract unique grades
    const typedData = (data || []) as { grade: string | null }[]
    const uniqueGrades = [...new Set(typedData.map(s => s.grade).filter(Boolean))] as string[]
    setGrades(uniqueGrades.sort())
  }

  async function fetchStudents() {
    if (!user?.center_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // If filtering by subject, we need to get student IDs first
      let studentIdsFromSubject: string[] | null = null
      if (subjectFilter) {
        const { data: studentSubjects } = await supabase
          .from('student_subjects')
          .select('student_id')
          .eq('subject_id', subjectFilter)
          .eq('status', 'active')

        const typedSubjects = (studentSubjects || []) as { student_id: string }[]
        studentIdsFromSubject = typedSubjects.map(ss => ss.student_id)
      }

      // If filtering by payment status, get student IDs with outstanding/paid fees
      let studentIdsFromPayment: string[] | null = null
      if (paymentStatusFilter || paymentMonthFilter) {
        let feeQuery = supabase
          .from('student_fees')
          .select('student_id, amount_due, amount_paid, fee_month')
          .eq('center_id', user.center_id)

        // Filter by specific month if selected
        if (paymentMonthFilter && paymentYearFilter) {
          const feeMonth = `${paymentYearFilter}-${paymentMonthFilter.padStart(2, '0')}-01`
          feeQuery = feeQuery.eq('fee_month', feeMonth)
        }

        const { data: studentFees } = await feeQuery

        if (studentFees) {
          interface FeeData { student_id: string; amount_due: number; amount_paid: number; fee_month: string }
          const typedFees = studentFees as FeeData[]
          const studentPaymentMap = new Map<string, { total: number; paid: number }>()
          typedFees.forEach(fee => {
            const current = studentPaymentMap.get(fee.student_id) || { total: 0, paid: 0 }
            studentPaymentMap.set(fee.student_id, {
              total: current.total + (fee.amount_due || 0),
              paid: current.paid + (fee.amount_paid || 0),
            })
          })

          studentIdsFromPayment = []

          if (paymentStatusFilter) {
            studentPaymentMap.forEach((value, studentId) => {
              const outstanding = value.total - value.paid
              if (paymentStatusFilter === 'paid' && outstanding <= 0 && value.total > 0) {
                studentIdsFromPayment!.push(studentId)
              } else if (paymentStatusFilter === 'unpaid' && outstanding > 0 && value.paid === 0) {
                studentIdsFromPayment!.push(studentId)
              } else if (paymentStatusFilter === 'partial' && outstanding > 0 && value.paid > 0) {
                studentIdsFromPayment!.push(studentId)
              }
            })
          } else if (paymentMonthFilter) {
            // If only month filter without status, show students who have fees for that month
            studentPaymentMap.forEach((value, studentId) => {
              studentIdsFromPayment!.push(studentId)
            })
          }
        }
      }

      let query = supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('center_id', user.center_id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (genderFilter) {
        query = query.eq('gender', genderFilter)
      }
      if (gradeFilter) {
        query = query.eq('grade', gradeFilter)
      }
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,student_number.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }
      if (studentIdsFromSubject !== null) {
        if (studentIdsFromSubject.length === 0) {
          setStudents([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }
        query = query.in('id', studentIdsFromSubject)
      }
      if (studentIdsFromPayment !== null) {
        if (studentIdsFromPayment.length === 0) {
          setStudents([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }
        query = query.in('id', studentIdsFromPayment)
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      setStudents((data || []) as Student[])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to fetch students')
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchStudents()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function handleDelete() {
    if (!studentToDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id)

      if (error) throw error

      toast.success('Student deleted successfully')
      setDeleteModalOpen(false)
      setStudentToDelete(null)
      fetchStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      graduated: 'bg-blue-100 text-blue-700',
      withdrawn: 'bg-red-100 text-red-700',
    }
    return styles[status] || styles.inactive
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Students</h1>
            {studentLimit && studentLimit.limit !== -1 && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                studentLimit.isAtLimit
                  ? 'bg-red-100 text-red-700'
                  : studentLimit.isNearLimit
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Users className="w-3.5 h-3.5" />
                {studentLimit.current}/{formatLimit(studentLimit.limit)}
                {studentLimit.isAtLimit && ' (Limit reached)'}
                {studentLimit.isNearLimit && !studentLimit.isAtLimit && ` (${studentLimit.percentUsed}%)`}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 text-sm md:text-base">Manage your registered students</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/students/import">
            <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} className="w-full sm:w-auto">
              Import CSV
            </Button>
          </Link>
          {studentLimit?.isAtLimit ? (
            <Link href="/dashboard/subscription">
              <Button leftIcon={<TrendingUp className="w-4 h-4" />} className="w-full sm:w-auto">
                Upgrade to Add More
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/students/new">
              <Button leftIcon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto">
                Add Student
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Student Limit Warning */}
      {studentLimit?.isNearLimit && !studentLimit.isAtLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Approaching student limit</p>
            <p className="text-sm text-amber-700 mt-1">
              You&apos;re using {studentLimit.percentUsed}% of your {studentLimit.tier} plan limit ({studentLimit.current}/{studentLimit.limit} students).{' '}
              <Link href="/dashboard/subscription" className="underline font-medium">
                Upgrade your plan
              </Link>{' '}
              to add more students.
            </p>
          </div>
        </div>
      )}

      {studentLimit?.isAtLimit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Student limit reached</p>
            <p className="text-sm text-red-700 mt-1">
              You&apos;ve reached your {studentLimit.tier} plan limit of {studentLimit.limit} students.{' '}
              <Link href="/dashboard/subscription" className="underline font-medium">
                Upgrade your plan
              </Link>{' '}
              to add more students.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        {/* Main filters row - all inline */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Quick filters */}
          <Select
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'graduated', label: 'Graduated' },
              { value: 'withdrawn', label: 'Withdrawn' },
            ]}
            placeholder="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className="w-28"
          />
          <Select
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            placeholder="Gender"
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1) }}
            className="w-28"
          />
          <Select
            options={grades.map(g => ({ value: g, label: `Grade ${g}` }))}
            placeholder="Grade"
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setCurrentPage(1) }}
            className="w-28"
          />
          <Select
            options={subjects.map(s => ({ value: s.id, label: s.name }))}
            placeholder="Subject"
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setCurrentPage(1) }}
            className="w-36"
          />

          {/* Payment filter group */}
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-xs text-amber-700 font-medium px-1">Payment:</span>
            <Select
              options={[
                { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' }, { value: '3', label: 'Mar' },
                { value: '4', label: 'Apr' }, { value: '5', label: 'May' }, { value: '6', label: 'Jun' },
                { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' }, { value: '9', label: 'Sep' },
                { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
              ]}
              placeholder="Month"
              value={paymentMonthFilter}
              onChange={(e) => { setPaymentMonthFilter(e.target.value); setCurrentPage(1) }}
              className="w-20"
            />
            <Select
              options={[
                { value: (new Date().getFullYear() - 1).toString(), label: (new Date().getFullYear() - 1).toString() },
                { value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString() },
                { value: (new Date().getFullYear() + 1).toString(), label: (new Date().getFullYear() + 1).toString() },
              ]}
              value={paymentYearFilter}
              onChange={(e) => { setPaymentYearFilter(e.target.value); setCurrentPage(1) }}
              className="w-20"
            />
            <Select
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Partial' },
                { value: 'unpaid', label: 'Unpaid' },
              ]}
              placeholder="Status"
              value={paymentStatusFilter}
              onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1) }}
              className="w-24"
            />
          </div>

          {/* Clear all button */}
          {(statusFilter || genderFilter || gradeFilter || subjectFilter || paymentStatusFilter || paymentMonthFilter) && (
            <button
              onClick={() => {
                setStatusFilter(''); setGenderFilter(''); setGradeFilter('')
                setSubjectFilter(''); setPaymentStatusFilter(''); setPaymentMonthFilter('')
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
        {(statusFilter || genderFilter || gradeFilter || subjectFilter || paymentStatusFilter || paymentMonthFilter) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {statusFilter}
                <button onClick={() => { setStatusFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {genderFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                {genderFilter}
                <button onClick={() => { setGenderFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {gradeFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                Grade {gradeFilter}
                <button onClick={() => { setGradeFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {subjectFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">
                {subjects.find(s => s.id === subjectFilter)?.name}
                <button onClick={() => { setSubjectFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {paymentMonthFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(paymentMonthFilter) - 1]} {paymentYearFilter}
                <button onClick={() => { setPaymentMonthFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {paymentStatusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                {paymentStatusFilter}
                <button onClick={() => { setPaymentStatusFilter(''); setCurrentPage(1) }}><X className="w-3 h-3" /></button>
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
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter || genderFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding your first student'}
            </p>
            {!searchQuery && !statusFilter && !genderFilter && (
              <Link href="/dashboard/students/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Add Student
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {students.map((student) => (
                <div key={student.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-500">{student.student_number || 'No ID'}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(student.status)}`}>
                      {student.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Grade</p>
                      <p className="text-gray-900">{student.grade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="text-gray-900">{student.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Parent</p>
                      <p className="text-gray-900">{student.parent_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Parent Phone</p>
                      <p className="text-gray-900">{student.parent_phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={`/dashboard/students/${student.id}`} className="flex-1">
                      <button className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </Link>
                    <Link href={`/dashboard/students/${student.id}/edit`} className="flex-1">
                      <button className="w-full py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => {
                        setStudentToDelete(student)
                        setDeleteModalOpen(true)
                      }}
                      className="flex-1 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-sm text-gray-500">{student.student_number || 'No ID'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900">{student.phone || '-'}</p>
                          <p className="text-sm text-gray-500">{student.email || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {student.grade || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900">{student.parent_name || '-'}</p>
                          <p className="text-sm text-gray-500">{student.parent_phone || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/students/${student.id}`}>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <Link href={`/dashboard/students/${student.id}/edit`}>
                            <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => {
                              setStudentToDelete(student)
                              setDeleteModalOpen(true)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 text-center sm:text-left">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} students
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setStudentToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete "${studentToDelete?.full_name}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  )
}
