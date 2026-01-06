'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ArrowLeft, Save, Upload, User } from 'lucide-react'
import toast from 'react-hot-toast'

interface Subject {
  id: string
  name: string
  code: string | null
  monthly_fee: number
}

interface CenterSettings {
  registration_fee: number
  late_payment_penalty: number
  payment_due_day: number
  terms_and_conditions: string | null
  payment_months: number[]
}

export default function NewStudentPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [centerSettings, setCenterSettings] = useState<CenterSettings>({
    registration_fee: 300,
    late_payment_penalty: 70,
    payment_due_day: 5,
    terms_and_conditions: null,
    payment_months: [1, 2, 3, 4, 5, 6, 7, 8, 9], // Default Feb-Oct
  })
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // Form state - Student Information
  const [formData, setFormData] = useState({
    // Student details
    surname: '',
    first_name: '',
    gender: '',
    date_of_birth: '',
    id_number: '',
    phone: '',
    email: '',
    health_conditions: '',
    grade: '',
    school_name: '',

    // Parent/Guardian
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    relationship: '',

    // Person responsible for payment
    payer_name: '',
    payer_id_number: '',
    payer_phone: '',
    payer_relationship: '',
    payer_same_as_parent: false,

    // Terms
    terms_accepted: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user?.center_id) {
      fetchSubjects()
      fetchCenterSettings()
    }
  }, [user?.center_id])

  async function fetchSubjects() {
    if (!user?.center_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('subjects')
      .select('id, name, code, monthly_fee')
      .eq('center_id', user.center_id)
      .eq('is_active', true)
      .order('name')

    setSubjects((data || []) as Subject[])
  }

  async function fetchCenterSettings() {
    if (!user?.center_id) return

    const supabase = createClient()
    const { data } = await supabase
      .from('tutorial_centers')
      .select('default_registration_fee, late_payment_penalty, payment_due_day, terms_and_conditions, payment_months')
      .eq('id', user.center_id)
      .single()

    if (data) {
      const centerData = data as {
        default_registration_fee: number
        late_payment_penalty: number
        payment_due_day: number
        terms_and_conditions: string | null
        payment_months: number[] | null
      }
      setCenterSettings({
        registration_fee: centerData.default_registration_fee || 300,
        late_payment_penalty: centerData.late_payment_penalty || 70,
        payment_due_day: centerData.payment_due_day || 5,
        terms_and_conditions: centerData.terms_and_conditions,
        payment_months: centerData.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9],
      })
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }))

      // If "same as parent" is checked, copy parent info to payer
      if (name === 'payer_same_as_parent' && checked) {
        setFormData((prev) => ({
          ...prev,
          payer_same_as_parent: true,
          payer_name: prev.parent_name,
          payer_phone: prev.parent_phone,
          payer_relationship: prev.relationship,
        }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.surname.trim()) newErrors.surname = 'Surname is required'
      if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
      if (!formData.gender) newErrors.gender = 'Gender is required'
      if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
      if (!formData.phone.trim()) newErrors.phone = 'Mobile number is required'
    }

    if (step === 2) {
      if (!formData.parent_name.trim()) newErrors.parent_name = 'Parent/Guardian name is required'
      if (!formData.parent_phone.trim()) newErrors.parent_phone = 'Parent phone is required'
    }

    if (step === 3) {
      if (selectedSubjects.length === 0) {
        toast.error('Please select at least one subject')
        return false
      }
    }

    if (step === 4) {
      if (!formData.payer_name.trim()) newErrors.payer_name = 'Name is required'
      if (!formData.payer_id_number.trim()) newErrors.payer_id_number = 'ID number is required'
      if (!formData.payer_phone.trim()) newErrors.payer_phone = 'Phone number is required'
      if (!formData.terms_accepted) {
        toast.error('You must accept the terms and conditions')
        return false
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Calculate fees
  const selectedSubjectsData = subjects.filter((s) => selectedSubjects.includes(s.id))
  const monthlyTotal = selectedSubjectsData.reduce((sum, s) => sum + s.monthly_fee, 0)
  const registrationFee = centerSettings.registration_fee || 300
  const paymentMonthsCount = centerSettings.payment_months.length
  const yearlyTotal = (monthlyTotal * paymentMonthsCount) + registrationFee

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateStep(4)) return
    if (!user?.center_id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Create full_name from surname and first_name
      const full_name = `${formData.surname} ${formData.first_name}`.trim()

      // Create student
      const insertData = {
        center_id: user.center_id,
        full_name,
        surname: formData.surname,
        first_name: formData.first_name,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        id_number: formData.id_number || null,
        phone: formData.phone || null,
        email: formData.email || null,
        health_conditions: formData.health_conditions || null,
        grade: formData.grade || null,
        school_name: formData.school_name || null,
        parent_name: formData.parent_name || null,
        parent_phone: formData.parent_phone || null,
        parent_email: formData.parent_email || null,
        relationship: formData.relationship || null,
        payer_name: formData.payer_name || null,
        payer_id_number: formData.payer_id_number || null,
        payer_phone: formData.payer_phone || null,
        payer_relationship: formData.payer_relationship || null,
        registration_fee_amount: registrationFee,
        terms_accepted: formData.terms_accepted,
        terms_accepted_date: formData.terms_accepted ? new Date().toISOString() : null,
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert(insertData as never)
        .select('id')
        .single()

      if (studentError) throw studentError

      // Enroll in selected subjects
      const typedStudent = student as { id: string } | null
      if (selectedSubjects.length > 0 && typedStudent) {
        const enrollments = selectedSubjects.map((subjectId) => ({
          student_id: typedStudent.id,
          subject_id: subjectId,
        }))

        const { error: enrollError } = await supabase
          .from('student_subjects')
          .insert(enrollments as never)

        if (enrollError) {
          console.error('Error enrolling in subjects:', enrollError)
        }
      }

      // Create registration fee record in student_fees table
      if (typedStudent && registrationFee > 0) {
        const registrationDate = new Date()
        const feeMonth = `${registrationDate.getFullYear()}-${String(registrationDate.getMonth() + 1).padStart(2, '0')}-01`
        const dueDateStr = registrationDate.toISOString().split('T')[0]

        const { error: feeError } = await supabase
          .from('student_fees')
          .insert({
            center_id: user.center_id,
            student_id: typedStudent.id,
            fee_type: 'registration',
            fee_month: feeMonth,
            amount_due: registrationFee,
            amount_paid: 0,
            due_date: dueDateStr,
            status: 'unpaid',
          } as never)

        if (feeError) {
          console.error('Error creating registration fee:', feeError)
        }
      }

      toast.success('Student registered successfully!')
      router.push(`/dashboard/students/${typedStudent?.id}`)
    } catch (error) {
      console.error('Error creating student:', error)
      toast.error('Failed to register student')
    } finally {
      setIsLoading(false)
    }
  }

  // Default terms if center hasn't set custom ones
  const defaultTerms = `By enrolling at this Tutorial Center, I acknowledge that:

• I am receiving an educational benefit and the costs are payable monthly
• I acknowledge financial responsibility for all tuition fees and charges
• Tuition fees must be paid on or before the ${centerSettings.payment_due_day}th of every month
• A late payment penalty of N$${centerSettings.late_payment_penalty?.toFixed(2) || '70.00'} will be applied for overdue payments
• Registration fees are non-refundable under any circumstances
• The College may prevent class attendance until fees are paid
• I authorize the College to contact me regarding my account`

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Students
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Student Registration</h1>
        <p className="text-gray-500 mt-1">Complete the enrollment form below</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Student Info', 'Parent/Guardian', 'Subject Enrollment', 'Payment & Terms'].map((label, index) => {
            const step = index + 1
            const isActive = step === currentStep
            const isCompleted = step < currentStep

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '✓' : step}
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`h-1 flex-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Student Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Student Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Surname"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                error={errors.surname}
                required
              />
              <Input
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                error={errors.first_name}
                required
              />
              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                error={errors.gender}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Select gender"
                required
              />
              <Input
                label="Date of Birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                error={errors.date_of_birth}
                required
              />
              <Input
                label="ID Number (Optional)"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
              />
              <Input
                label="Mobile Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                required
              />
              <Input
                label="Email (Optional)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              <Input
                label="Grade/Form"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                placeholder="e.g., Grade 10, Form 4"
              />
              <Input
                label="School Name (Optional)"
                name="school_name"
                value={formData.school_name}
                onChange={handleChange}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Health Conditions (If any that may affect studies)"
                  name="health_conditions"
                  value={formData.health_conditions}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Please elaborate if you have any health problems that may affect your studies..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Parent/Guardian Information */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Parent/Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Parent/Guardian Full Name"
                name="parent_name"
                value={formData.parent_name}
                onChange={handleChange}
                error={errors.parent_name}
                required
              />
              <Select
                label="Relationship"
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                options={[
                  { value: 'father', label: 'Father' },
                  { value: 'mother', label: 'Mother' },
                  { value: 'guardian', label: 'Guardian' },
                  { value: 'uncle', label: 'Uncle' },
                  { value: 'aunt', label: 'Aunt' },
                  { value: 'grandparent', label: 'Grandparent' },
                  { value: 'sibling', label: 'Sibling' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Select relationship"
              />
              <Input
                label="Parent/Guardian Phone"
                name="parent_phone"
                value={formData.parent_phone}
                onChange={handleChange}
                error={errors.parent_phone}
                required
              />
              <Input
                label="Parent/Guardian Email (Optional)"
                name="parent_email"
                type="email"
                value={formData.parent_email}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {/* Step 3: Subject Enrollment */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 pb-2 border-b">Subject Enrollment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select the subjects the student will be enrolled in. Each subject has a monthly fee.
            </p>

            {/* Registration Fee Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Registration Fee:</span> N${registrationFee.toFixed(2)} (non-refundable)
              </p>
            </div>

            {subjects.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSubjects.includes(subject.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => toggleSubject(subject.id)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{subject.name}</p>
                        {subject.code && (
                          <p className="text-xs text-gray-500">{subject.code}</p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">
                        N${subject.monthly_fee.toFixed(2)}
                      </p>
                    </label>
                  ))}
                </div>

                {/* Fee Summary */}
                {selectedSubjects.length > 0 && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Financial Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registration Fee (once-off)</span>
                        <span className="font-medium">N${registrationFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Monthly Tuition ({selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''})
                        </span>
                        <span className="font-medium">N${monthlyTotal.toFixed(2)}/month</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Instalment: N${monthlyTotal.toFixed(2)} x {paymentMonthsCount} months</span>
                        <span>N${(monthlyTotal * paymentMonthsCount).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold text-gray-900">
                          <span>Total Due (Yearly)</span>
                          <span>N${yearlyTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No subjects available. Please add subjects in Settings first.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Payment & Terms */}
        {currentStep === 4 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Person Responsible for Payment</h2>

              {/* Same as parent checkbox */}
              <label className="flex items-center mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  name="payer_same_as_parent"
                  checked={formData.payer_same_as_parent}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Same as Parent/Guardian</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="payer_name"
                  value={formData.payer_name}
                  onChange={handleChange}
                  error={errors.payer_name}
                  required
                  disabled={formData.payer_same_as_parent}
                />
                <Input
                  label="ID Number"
                  name="payer_id_number"
                  value={formData.payer_id_number}
                  onChange={handleChange}
                  error={errors.payer_id_number}
                  required
                />
                <Input
                  label="Mobile Number"
                  name="payer_phone"
                  value={formData.payer_phone}
                  onChange={handleChange}
                  error={errors.payer_phone}
                  required
                  disabled={formData.payer_same_as_parent}
                />
                <Select
                  label="Relationship to Student"
                  name="payer_relationship"
                  value={formData.payer_relationship}
                  onChange={handleChange}
                  options={[
                    { value: 'parent', label: 'Parent' },
                    { value: 'guardian', label: 'Guardian' },
                    { value: 'self', label: 'Self' },
                    { value: 'sponsor', label: 'Sponsor' },
                    { value: 'other', label: 'Other' },
                  ]}
                  placeholder="Select relationship"
                  disabled={formData.payer_same_as_parent}
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Student Acknowledgement of Financial Obligation
              </h2>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {centerSettings.terms_and_conditions || defaultTerms}
                </pre>
              </div>

              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  checked={formData.terms_accepted}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5"
                />
                <span className="ml-3 text-sm text-gray-700">
                  By checking this box, I acknowledge that I understand the relevant policies and the effect
                  of these changes on my financial aid and tuition liability, and still request to be
                  registered at this Tutorial Center as listed on this form.
                </span>
              </label>
            </div>

            {/* Final Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Registration Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Student Name</p>
                  <p className="font-medium text-blue-900">{formData.surname} {formData.first_name}</p>
                </div>
                <div>
                  <p className="text-blue-700">Subjects Enrolled</p>
                  <p className="font-medium text-blue-900">{selectedSubjects.length} subject(s)</p>
                </div>
                <div>
                  <p className="text-blue-700">Monthly Fee</p>
                  <p className="font-medium text-blue-900">N${monthlyTotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-blue-700">Total Due (Year)</p>
                  <p className="font-medium text-blue-900">N${yearlyTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/students">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            {currentStep < totalSteps ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                isLoading={isLoading}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Complete Registration
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
