'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/stores/onboarding-store'
import {
  Calendar,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Subject {
  id: string
  name: string
  monthly_fee: number
  is_active: boolean
}

const MONTHS = [
  { value: 0, label: 'January', short: 'Jan' },
  { value: 1, label: 'February', short: 'Feb' },
  { value: 2, label: 'March', short: 'Mar' },
  { value: 3, label: 'April', short: 'Apr' },
  { value: 4, label: 'May', short: 'May' },
  { value: 5, label: 'June', short: 'Jun' },
  { value: 6, label: 'July', short: 'Jul' },
  { value: 7, label: 'August', short: 'Aug' },
  { value: 8, label: 'September', short: 'Sep' },
  { value: 9, label: 'October', short: 'Oct' },
  { value: 10, label: 'November', short: 'Nov' },
  { value: 11, label: 'December', short: 'Dec' },
]

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics', monthly_fee: 300 },
  { name: 'English', monthly_fee: 300 },
  { name: 'Physical Science', monthly_fee: 350 },
  { name: 'Life Sciences', monthly_fee: 300 },
  { name: 'Accounting', monthly_fee: 300 },
  { name: 'Business Studies', monthly_fee: 300 },
]

export function SetupWizard() {
  const { user, fetchUser, isCenterAdmin } = useAuthStore()
  const { completeChecklistItem } = useOnboardingStore()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)

  // Academic Year State
  const [paymentMonths, setPaymentMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const [registrationFee, setRegistrationFee] = useState(0)

  // Subjects State
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [newSubject, setNewSubject] = useState({ name: '', monthly_fee: 300 })
  const [showAddSubject, setShowAddSubject] = useState(false)

  // Check if setup is needed
  useEffect(() => {
    async function checkSetup() {
      if (!user?.center_id || !isCenterAdmin()) {
        setIsCheckingSetup(false)
        return
      }

      try {
        // Check if center has payment_months set (null = not configured)
        const { data: center } = await supabase
          .from('tutorial_centers')
          .select('payment_months, default_registration_fee, initial_setup_completed')
          .eq('id', user.center_id)
          .single<{ payment_months: number[] | null; default_registration_fee: number | null; initial_setup_completed: boolean | null }>()

        // Check if there are any subjects
        const { count: subjectCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('center_id', user.center_id)

        // Show wizard if initial setup not completed
        if (center && !center.initial_setup_completed) {
          setPaymentMonths(center.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9])
          setRegistrationFee(center.default_registration_fee || 0)

          // Load existing subjects or prepare defaults
          if (subjectCount && subjectCount > 0) {
            await loadSubjects()
          }

          setIsOpen(true)
        }
      } catch (error) {
        console.error('Error checking setup:', error)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetup()
  }, [user?.center_id])

  async function loadSubjects() {
    if (!user?.center_id) return

    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, monthly_fee, is_active')
      .eq('center_id', user.center_id)
      .order('name')

    if (!error && data) {
      setSubjects(data)
    }
  }

  const togglePaymentMonth = (month: number) => {
    setPaymentMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
  }

  async function handleSaveAcademicYear() {
    if (!user?.center_id) return

    if (paymentMonths.length === 0) {
      toast.error('Please select at least one payment month')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('tutorial_centers')
        .update({
          payment_months: paymentMonths,
          default_registration_fee: registrationFee,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.center_id)

      if (error) throw error

      toast.success('Academic year settings saved!')
      setCurrentStep(1) // Move to subjects step
    } catch (error) {
      console.error('Error saving academic settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateDefaultSubjects() {
    if (!user?.center_id) return

    setIsLoading(true)
    try {
      const subjectsToCreate = DEFAULT_SUBJECTS.map(s => ({
        center_id: user.center_id,
        name: s.name,
        monthly_fee: s.monthly_fee,
        is_active: true,
      }))

      const { error } = await supabase.from('subjects').insert(subjectsToCreate as never)

      if (error) throw error

      await loadSubjects()
      toast.success('Default subjects created!')
    } catch (error) {
      console.error('Error creating subjects:', error)
      toast.error('Failed to create subjects')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddSubject() {
    if (!user?.center_id || !newSubject.name.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from('subjects').insert({
        center_id: user.center_id,
        name: newSubject.name.trim(),
        monthly_fee: newSubject.monthly_fee,
        is_active: true,
      } as never)

      if (error) throw error

      await loadSubjects()
      setNewSubject({ name: '', monthly_fee: 300 })
      setShowAddSubject(false)
      toast.success('Subject added!')
    } catch (error) {
      console.error('Error adding subject:', error)
      toast.error('Failed to add subject')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateSubject() {
    if (!editingSubject) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: editingSubject.name,
          monthly_fee: editingSubject.monthly_fee,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', editingSubject.id)

      if (error) throw error

      await loadSubjects()
      setEditingSubject(null)
      toast.success('Subject updated!')
    } catch (error) {
      console.error('Error updating subject:', error)
      toast.error('Failed to update subject')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm('Are you sure you want to delete this subject?')) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id)

      if (error) throw error

      await loadSubjects()
      toast.success('Subject deleted!')
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('Failed to delete subject')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCompleteSetup() {
    if (!user?.center_id) return

    if (subjects.length === 0) {
      toast.error('Please add at least one subject before continuing')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('tutorial_centers')
        .update({
          initial_setup_completed: true,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.center_id)

      if (error) throw error

      // Mark checklist items as complete
      completeChecklistItem('add-subject')

      await fetchUser()
      setIsOpen(false)
      toast.success('Setup complete! You can now start adding students.')
    } catch (error) {
      console.error('Error completing setup:', error)
      toast.error('Failed to complete setup')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSetup || !isOpen) return null

  const steps = [
    { title: 'Academic Year', icon: Calendar },
    { title: 'Subjects', icon: BookOpen },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Welcome to Your Tutorial Centre!</h2>
              <p className="text-blue-100 text-sm">Let&apos;s set up a few things before you start</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === index
              const isComplete = currentStep > index

              return (
                <div key={index} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : isComplete
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 mx-2 text-white/40" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Academic Year */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Configure Your Academic Year
                </h3>
                <p className="text-gray-600 text-sm">
                  Select the months when students will be charged fees. This helps calculate yearly totals automatically.
                </p>
              </div>

              {/* Month Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Months
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MONTHS.map((month) => {
                    const isSelected = paymentMonths.includes(month.value)
                    return (
                      <button
                        key={month.value}
                        type="button"
                        onClick={() => togglePaymentMonth(month.value)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle className="absolute top-1 right-1 w-3 h-3 text-blue-600" />
                        )}
                        <span className="text-sm font-medium">{month.short}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Selected: <span className="font-medium text-gray-900">{paymentMonths.length} months</span>
                </p>
              </div>

              {/* Fee Calculation Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Fee Calculation Example</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      If a subject costs R 300/month, the yearly total will be:
                      <br />
                      <span className="font-bold">
                        R 300 x {paymentMonths.length} months = R {(300 * paymentMonths.length).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Registration Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Registration Fee (R)
                </label>
                <input
                  type="number"
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This one-time fee will be added when enrolling new students
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Set Up Your Subjects
                </h3>
                <p className="text-gray-600 text-sm">
                  Add the subjects you offer and set their monthly fees. You can always add more later.
                </p>
              </div>

              {/* Quick Start - Create Default Subjects */}
              {subjects.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">Quick Start</h4>
                  <p className="text-sm text-amber-700 mb-3">
                    Click below to create common subjects, then edit their prices to match your rates.
                  </p>
                  <button
                    onClick={handleCreateDefaultSubjects}
                    disabled={isLoading}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Create Default Subjects
                  </button>
                </div>
              )}

              {/* Subject List */}
              {subjects.length > 0 && (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      {editingSubject?.id === subject.id ? (
                        <div className="flex-1 flex items-center gap-3">
                          <input
                            type="text"
                            value={editingSubject.name}
                            onChange={(e) =>
                              setEditingSubject({ ...editingSubject, name: e.target.value })
                            }
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-sm">R</span>
                            <input
                              type="number"
                              value={editingSubject.monthly_fee}
                              onChange={(e) =>
                                setEditingSubject({
                                  ...editingSubject,
                                  monthly_fee: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            />
                          </div>
                          <button
                            onClick={handleUpdateSubject}
                            disabled={isLoading}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSubject(null)}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-gray-900">{subject.name}</p>
                            <p className="text-sm text-gray-500">
                              R {subject.monthly_fee.toLocaleString()}/month
                              <span className="text-gray-400 ml-2">
                                = R {(subject.monthly_fee * paymentMonths.length).toLocaleString()}/year
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingSubject(subject)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Subject */}
              {showAddSubject ? (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                      placeholder="Subject name"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-sm">R</span>
                      <input
                        type="number"
                        value={newSubject.monthly_fee}
                        onChange={(e) =>
                          setNewSubject({ ...newSubject, monthly_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-24 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleAddSubject}
                      disabled={isLoading || !newSubject.name.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubject(false)
                        setNewSubject({ name: '', monthly_fee: 300 })
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSubject(true)}
                  className="w-full p-3 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Subject
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep === 0 ? (
              <button
                onClick={handleSaveAcademicYear}
                disabled={isLoading || paymentMonths.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCompleteSetup}
                disabled={isLoading || subjects.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
