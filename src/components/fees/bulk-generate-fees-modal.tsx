'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  X,
  CalendarPlus,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/currency'

interface BulkGenerateFeesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface StudentPreview {
  id: string
  full_name: string
  student_number: string | null
  subjects_count: number
  monthly_fee: number
}

interface CenterSettings {
  payment_months: number[] | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function BulkGenerateFeesModal({ isOpen, onClose, onSuccess }: BulkGenerateFeesModalProps) {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [centerSettings, setCenterSettings] = useState<CenterSettings | null>(null)
  const [eligibleStudents, setEligibleStudents] = useState<StudentPreview[]>([])
  const [existingFeeMonths, setExistingFeeMonths] = useState<Set<string>>(new Set())
  const [generationResult, setGenerationResult] = useState<{
    success: boolean
    studentsProcessed: number
    feesGenerated: number
  } | null>(null)

  // Fetch center settings and eligible students when modal opens
  useEffect(() => {
    if (isOpen && user?.center_id) {
      fetchData()
    }
  }, [isOpen, user?.center_id])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMonths([])
      setGenerationResult(null)
    }
  }, [isOpen])

  async function fetchData() {
    if (!user?.center_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch center settings
      const { data: centerData } = await supabase
        .from('tutorial_centers')
        .select('payment_months')
        .eq('id', user.center_id)
        .single()

      if (centerData) {
        setCenterSettings(centerData as CenterSettings)
      }

      // Fetch active students with their enrolled subjects
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id,
          full_name,
          student_number,
          student_subjects!inner(
            is_active,
            subject:subjects(monthly_fee)
          )
        `)
        .eq('center_id', user.center_id)
        .eq('status', 'active')
        .eq('student_subjects.is_active', true)

      if (studentsData) {
        // Process students to calculate their monthly fees
        const processedStudents: StudentPreview[] = []
        const studentMap = new Map<string, StudentPreview>()

        for (const student of studentsData as any[]) {
          if (!studentMap.has(student.id)) {
            const subjects = student.student_subjects || []
            const monthlyFee = subjects.reduce((sum: number, ss: any) => {
              return sum + (ss.subject?.monthly_fee || 0)
            }, 0)

            if (monthlyFee > 0) {
              studentMap.set(student.id, {
                id: student.id,
                full_name: student.full_name,
                student_number: student.student_number,
                subjects_count: subjects.length,
                monthly_fee: monthlyFee,
              })
            }
          }
        }

        setEligibleStudents(Array.from(studentMap.values()))
      }

      // Fetch existing fee records for the selected year
      const yearStart = `${selectedYear}-01-01`
      const yearEnd = `${selectedYear}-12-31`

      const { data: feesData } = await supabase
        .from('student_fees')
        .select('fee_month, student_id')
        .eq('fee_type', 'tuition')
        .gte('fee_month', yearStart)
        .lte('fee_month', yearEnd)

      if (feesData) {
        // Create a set of "studentId-feeMonth" combinations
        const existingSet = new Set<string>()
        for (const fee of feesData as any[]) {
          existingSet.add(`${fee.student_id}-${fee.fee_month}`)
        }
        setExistingFeeMonths(existingSet)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh existing fees when year changes
  useEffect(() => {
    if (isOpen && user?.center_id) {
      fetchExistingFees()
    }
  }, [selectedYear])

  async function fetchExistingFees() {
    if (!user?.center_id) return

    const supabase = createClient()
    const yearStart = `${selectedYear}-01-01`
    const yearEnd = `${selectedYear}-12-31`

    const { data: feesData } = await supabase
      .from('student_fees')
      .select('fee_month, student_id')
      .eq('fee_type', 'tuition')
      .gte('fee_month', yearStart)
      .lte('fee_month', yearEnd)

    if (feesData) {
      const existingSet = new Set<string>()
      for (const fee of feesData as any[]) {
        existingSet.add(`${fee.student_id}-${fee.fee_month}`)
      }
      setExistingFeeMonths(existingSet)
    }
  }

  // Toggle month selection
  const toggleMonth = (monthIndex: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthIndex)
        ? prev.filter(m => m !== monthIndex)
        : [...prev, monthIndex].sort((a, b) => a - b)
    )
  }

  // Select current month
  const selectCurrentMonth = () => {
    const currentMonth = new Date().getMonth()
    if (!selectedMonths.includes(currentMonth)) {
      setSelectedMonths([currentMonth])
    }
  }

  // Calculate how many new fees will be generated
  const calculateNewFees = () => {
    let totalNewFees = 0
    let totalAmount = 0

    for (const student of eligibleStudents) {
      for (const monthIndex of selectedMonths) {
        const feeMonth = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
        const key = `${student.id}-${feeMonth}`
        if (!existingFeeMonths.has(key)) {
          totalNewFees++
          totalAmount += student.monthly_fee
        }
      }
    }

    return { totalNewFees, totalAmount }
  }

  const { totalNewFees, totalAmount } = calculateNewFees()

  // Generate fees for all eligible students
  async function handleGenerate() {
    if (!user?.center_id || selectedMonths.length === 0) return

    setIsGenerating(true)
    const supabase = createClient()

    try {
      const feeRecords: Array<{
        center_id: string
        student_id: string
        fee_month: string
        fee_type: string
        amount_due: number
        amount_paid: number
        status: string
        due_date: string
      }> = []

      for (const student of eligibleStudents) {
        for (const monthIndex of selectedMonths) {
          const feeMonth = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
          const key = `${student.id}-${feeMonth}`

          // Skip if fee already exists
          if (existingFeeMonths.has(key)) continue

          // Due date is 7th of the month
          const dueDate = new Date(selectedYear, monthIndex, 7)

          feeRecords.push({
            center_id: user.center_id,
            student_id: student.id,
            fee_month: feeMonth,
            fee_type: 'tuition',
            amount_due: student.monthly_fee,
            amount_paid: 0,
            status: 'unpaid',
            due_date: dueDate.toISOString().split('T')[0],
          })
        }
      }

      if (feeRecords.length === 0) {
        toast.success('All fees already exist for selected months')
        setGenerationResult({
          success: true,
          studentsProcessed: eligibleStudents.length,
          feesGenerated: 0,
        })
        return
      }

      // Insert in batches of 100 to avoid timeouts
      const batchSize = 100
      let totalInserted = 0

      for (let i = 0; i < feeRecords.length; i += batchSize) {
        const batch = feeRecords.slice(i, i + batchSize)
        const { error } = await supabase
          .from('student_fees')
          .insert(batch as never)

        if (error) throw error
        totalInserted += batch.length
      }

      setGenerationResult({
        success: true,
        studentsProcessed: eligibleStudents.length,
        feesGenerated: totalInserted,
      })

      toast.success(`Generated ${totalInserted} fee records for ${eligibleStudents.length} students`)
      onSuccess()
    } catch (error) {
      console.error('Error generating fees:', error)
      toast.error('Failed to generate fees')
      setGenerationResult({
        success: false,
        studentsProcessed: 0,
        feesGenerated: 0,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const paymentMonths = centerSettings?.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Monthly Fees</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create fee records for all active students
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : generationResult ? (
            // Show result
            <div className="text-center py-8">
              {generationResult.success ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Fees Generated Successfully
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Created {generationResult.feesGenerated} fee records for{' '}
                    {generationResult.studentsProcessed} students
                  </p>
                  <Button onClick={onClose}>
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Generation Failed
                  </h3>
                  <p className="text-gray-600 mb-4">
                    An error occurred while generating fees. Please try again.
                  </p>
                  <Button onClick={() => setGenerationResult(null)}>
                    Try Again
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Only active students will receive fees</p>
                  <p className="mt-1">
                    Students with status &quot;inactive&quot;, &quot;withdrawn&quot;, or &quot;graduated&quot; will be skipped.
                    Make sure to update student statuses before generating fees.
                  </p>
                </div>
              </div>

              {/* Year selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                >
                  {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Months to Generate
                  </label>
                  <button
                    type="button"
                    onClick={selectCurrentMonth}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select Current Month
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {MONTH_NAMES.map((month, index) => {
                    const isPaymentMonth = paymentMonths.includes(index)
                    const isSelected = selectedMonths.includes(index)

                    return (
                      <label
                        key={month}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : isPaymentMonth
                            ? 'border-gray-200 hover:bg-gray-50'
                            : 'border-gray-100 bg-gray-50 text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMonth(index)}
                          disabled={!isPaymentMonth}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{month.slice(0, 3)}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Greyed out months are not configured as payment months in your Academic Year Settings
                </p>
              </div>

              {/* Preview */}
              {selectedMonths.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-3">Generation Preview</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Active Students</p>
                      <p className="text-xl font-bold text-green-800">{eligibleStudents.length}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Months Selected</p>
                      <p className="text-xl font-bold text-green-800">{selectedMonths.length}</p>
                    </div>
                    <div>
                      <p className="text-green-700">New Fee Records</p>
                      <p className="text-xl font-bold text-green-800">{totalNewFees}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Total Amount</p>
                      <p className="text-xl font-bold text-green-800">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                  {totalNewFees === 0 && selectedMonths.length > 0 && (
                    <p className="text-sm text-amber-700 mt-3 bg-amber-50 p-2 rounded">
                      All fees already exist for the selected months. Nothing to generate.
                    </p>
                  )}
                </div>
              )}

              {/* Student count warning */}
              {eligibleStudents.length === 0 && (
                <div className="bg-amber-50 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">No eligible students found</p>
                    <p className="mt-1">
                      There are no active students with enrolled subjects.
                      Make sure students are marked as &quot;active&quot; and have subjects enrolled.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!generationResult && !isLoading && (
          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedMonths.length === 0 || totalNewFees === 0 || eligibleStudents.length === 0}
              leftIcon={
                isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarPlus className="w-4 h-4" />
                )
              }
            >
              {isGenerating ? 'Generating...' : `Generate ${totalNewFees} Fees`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
