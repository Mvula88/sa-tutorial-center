import { createClient } from '@/lib/supabase/client'

interface StudentSubject {
  id: string
  subject_id: string
  enrolled_date: string
  is_active: boolean
  subject: {
    id: string
    name: string
    monthly_fee: number
  }
}

interface StudentFee {
  id: string
  fee_month: string
  fee_type: string
  amount_due: number
  amount_paid: number
  balance: number
  status: string
}

/**
 * Generate monthly fees for a student based on their enrolled subjects
 * @param centerId - The center ID
 * @param studentId - The student ID
 * @param startMonth - Start month (YYYY-MM-DD format, first day of month)
 * @param endMonth - End month (YYYY-MM-DD format, first day of month)
 * @returns Object with success status and generated fees count
 */
export async function generateMonthlyFees(
  centerId: string,
  studentId: string,
  startMonth: string,
  endMonth: string
): Promise<{ success: boolean; feesGenerated: number; error?: string }> {
  const supabase = createClient()

  try {
    // Get student's active subject enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_subjects')
      .select(`
        id,
        subject_id,
        enrolled_date,
        is_active,
        subject:subjects(id, name, monthly_fee)
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)

    if (enrollError) throw enrollError

    if (!enrollments || enrollments.length === 0) {
      return { success: true, feesGenerated: 0 }
    }

    // Generate months between start and end
    const months: string[] = []
    const start = new Date(startMonth)
    const end = new Date(endMonth)

    while (start <= end) {
      months.push(start.toISOString().split('T')[0])
      start.setMonth(start.getMonth() + 1)
    }

    // Get existing fees to avoid duplicates
    const { data: existingFees } = await supabase
      .from('student_fees')
      .select('fee_month, fee_type')
      .eq('student_id', studentId)
      .in('fee_month', months)

    interface ExistingFee { fee_month: string; fee_type: string }
    const typedExistingFees = (existingFees || []) as ExistingFee[]
    const existingFeeKeys = new Set(
      typedExistingFees.map(f => `${f.fee_month}-${f.fee_type}`)
    )

    // Calculate total monthly tuition from all subjects
    const typedEnrollments = enrollments as unknown as StudentSubject[]
    const monthlyTuition = typedEnrollments.reduce(
      (sum, e) => sum + (e.subject?.monthly_fee || 0),
      0
    )

    // Prepare fee records
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

    for (const month of months) {
      const feeKey = `${month}-tuition`
      if (!existingFeeKeys.has(feeKey) && monthlyTuition > 0) {
        // Due date is 7th of the month
        const dueDate = new Date(month)
        dueDate.setDate(7)

        feeRecords.push({
          center_id: centerId,
          student_id: studentId,
          fee_month: month,
          fee_type: 'tuition',
          amount_due: monthlyTuition,
          amount_paid: 0,
          status: 'unpaid',
          due_date: dueDate.toISOString().split('T')[0],
        })
      }
    }

    if (feeRecords.length === 0) {
      return { success: true, feesGenerated: 0 }
    }

    // Insert fee records
    const { error: insertError } = await supabase
      .from('student_fees')
      .insert(feeRecords as never)

    if (insertError) throw insertError

    return { success: true, feesGenerated: feeRecords.length }
  } catch (error) {
    console.error('Error generating fees:', error)
    return {
      success: false,
      feesGenerated: 0,
      error: error instanceof Error ? error.message : 'Failed to generate fees',
    }
  }
}

/**
 * Allocate a payment across outstanding fees (oldest first - FIFO)
 * @param centerId - The center ID
 * @param studentId - The student ID
 * @param paymentAmount - The total payment amount
 * @param paymentId - The payment record ID (for linking)
 * @returns Object with allocation details
 */
export async function allocatePayment(
  centerId: string,
  studentId: string,
  paymentAmount: number,
  paymentId: string
): Promise<{
  success: boolean
  allocations: Array<{ feeId: string; month: string; amountAllocated: number }>
  remainingCredit: number
  error?: string
}> {
  const supabase = createClient()

  try {
    // Get all unpaid/partial fees for the student, ordered by month (oldest first)
    const { data: outstandingFees, error: fetchError } = await supabase
      .from('student_fees')
      .select('*')
      .eq('student_id', studentId)
      .neq('status', 'paid')
      .order('fee_month', { ascending: true })

    if (fetchError) throw fetchError

    let remainingPayment = paymentAmount
    const allocations: Array<{ feeId: string; month: string; amountAllocated: number }> = []

    // Allocate payment to each fee until payment is exhausted
    for (const fee of (outstandingFees || []) as StudentFee[]) {
      if (remainingPayment <= 0) break

      const balance = fee.amount_due - fee.amount_paid
      const allocationAmount = Math.min(remainingPayment, balance)

      if (allocationAmount > 0) {
        const newAmountPaid = fee.amount_paid + allocationAmount
        const newStatus =
          newAmountPaid >= fee.amount_due
            ? 'paid'
            : newAmountPaid > 0
            ? 'partial'
            : 'unpaid'

        // Update the fee record
        const { error: updateError } = await supabase
          .from('student_fees')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
          } as never)
          .eq('id', fee.id)

        if (updateError) throw updateError

        // If this is a registration fee and it's now fully paid, update the student record
        if (fee.fee_type === 'registration' && newStatus === 'paid') {
          await supabase
            .from('students')
            .update({
              registration_fee_paid: true,
              registration_fee_paid_date: new Date().toISOString(),
            } as never)
            .eq('id', studentId)
        }

        allocations.push({
          feeId: fee.id,
          month: fee.fee_month,
          amountAllocated: allocationAmount,
        })

        remainingPayment -= allocationAmount
      }
    }

    return {
      success: true,
      allocations,
      remainingCredit: remainingPayment,
    }
  } catch (error) {
    console.error('Error allocating payment:', error)
    return {
      success: false,
      allocations: [],
      remainingCredit: paymentAmount,
      error: error instanceof Error ? error.message : 'Failed to allocate payment',
    }
  }
}

/**
 * Get student fee summary
 * @param studentId - The student ID
 * @returns Fee summary with totals
 */
export async function getStudentFeeSummary(studentId: string): Promise<{
  totalDue: number
  totalPaid: number
  outstandingBalance: number
  fees: StudentFee[]
}> {
  const supabase = createClient()

  const { data: fees } = await supabase
    .from('student_fees')
    .select('*')
    .eq('student_id', studentId)
    .order('fee_month', { ascending: true })

  const typedFees = (fees || []) as StudentFee[]

  const totalDue = typedFees.reduce((sum, f) => sum + f.amount_due, 0)
  const totalPaid = typedFees.reduce((sum, f) => sum + f.amount_paid, 0)

  return {
    totalDue,
    totalPaid,
    outstandingBalance: totalDue - totalPaid,
    fees: typedFees,
  }
}

/**
 * Generate fees for all active students in a center for a given period
 * @param centerId - The center ID
 * @param startMonth - Start month (YYYY-MM-DD format)
 * @param endMonth - End month (YYYY-MM-DD format)
 * @returns Summary of generation
 */
export async function generateFeesForAllStudents(
  centerId: string,
  startMonth: string,
  endMonth: string
): Promise<{
  success: boolean
  studentsProcessed: number
  totalFeesGenerated: number
  errors: string[]
}> {
  const supabase = createClient()

  try {
    // Get all active students in the center
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('center_id', centerId)
      .eq('status', 'active')

    if (studentsError) throw studentsError

    let totalFeesGenerated = 0
    const errors: string[] = []

    interface StudentRow { id: string }
    const typedStudents = (students || []) as StudentRow[]
    for (const student of typedStudents) {
      const result = await generateMonthlyFees(
        centerId,
        student.id,
        startMonth,
        endMonth
      )

      if (result.success) {
        totalFeesGenerated += result.feesGenerated
      } else {
        errors.push(`Student ${student.id}: ${result.error}`)
      }
    }

    return {
      success: errors.length === 0,
      studentsProcessed: students?.length || 0,
      totalFeesGenerated,
      errors,
    }
  } catch (error) {
    console.error('Error generating fees for all students:', error)
    return {
      success: false,
      studentsProcessed: 0,
      totalFeesGenerated: 0,
      errors: [error instanceof Error ? error.message : 'Failed to generate fees'],
    }
  }
}
