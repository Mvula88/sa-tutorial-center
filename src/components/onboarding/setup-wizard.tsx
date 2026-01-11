'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOnboardingStore } from '@/stores/onboarding-store'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Settings,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Subject {
  id: string
  name: string
  monthly_fee: number
  is_active: boolean
}

const MONTHS = [
  { value: 0, short: 'Jan' },
  { value: 1, short: 'Feb' },
  { value: 2, short: 'Mar' },
  { value: 3, short: 'Apr' },
  { value: 4, short: 'May' },
  { value: 5, short: 'Jun' },
  { value: 6, short: 'Jul' },
  { value: 7, short: 'Aug' },
  { value: 8, short: 'Sep' },
  { value: 9, short: 'Oct' },
  { value: 10, short: 'Nov' },
  { value: 11, short: 'Dec' },
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
  const contentRef = useRef<HTMLDivElement>(null)

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
        const { data: center } = await supabase
          .from('tutorial_centers')
          .select('payment_months, default_registration_fee, initial_setup_completed')
          .eq('id', user.center_id)
          .single<{ payment_months: number[] | null; default_registration_fee: number | null; initial_setup_completed: boolean | null }>()

        const { count: subjectCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('center_id', user.center_id)

        if (center && !center.initial_setup_completed) {
          setPaymentMonths(center.payment_months || [1, 2, 3, 4, 5, 6, 7, 8, 9])
          setRegistrationFee(center.default_registration_fee || 0)

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

      toast.success('Settings saved')
      setCurrentStep(1)
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
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
      toast.success('Subjects created')
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
      toast.success('Subject added')
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
      toast.success('Subject updated')
    } catch (error) {
      console.error('Error updating subject:', error)
      toast.error('Failed to update subject')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm('Delete this subject?')) return

    setIsLoading(true)
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id)

      if (error) throw error

      await loadSubjects()
      toast.success('Subject deleted')
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
      toast.error('Add at least one subject to continue')
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

      completeChecklistItem('add-subject')
      await fetchUser()
      setIsOpen(false)
      toast.success('Setup complete')
    } catch (error) {
      console.error('Error completing setup:', error)
      toast.error('Failed to complete setup')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSetup || !isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              {currentStep === 0 ? (
                <Settings className="w-5 h-5 text-blue-600" />
              ) : (
                <BookOpen className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                {currentStep === 0 ? 'Configure fees' : 'Add subjects'}
              </h2>
              <p className="text-gray-500 text-sm">
                Step {currentStep + 1} of 2
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            <div className={`h-1 flex-1 rounded-full ${currentStep >= 0 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Step 1: Academic Year */}
          {currentStep === 0 && (
            <div className="space-y-5">
              {/* Registration Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration fee
                </label>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-lg">R</span>
                    <input
                      type="number"
                      value={registrationFee}
                      onChange={(e) => setRegistrationFee(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-transparent text-2xl font-semibold text-gray-900 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    One-time fee for new students
                  </p>
                </div>
              </div>

              {/* Month Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Payment months
                  </label>
                  <span className="text-xs text-gray-500">{paymentMonths.length} selected</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {MONTHS.map((month) => {
                    const isSelected = paymentMonths.includes(month.value)
                    return (
                      <button
                        key={month.value}
                        type="button"
                        onClick={() => togglePaymentMonth(month.value)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {month.short}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fee Preview */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Example yearly fee</span>
                  <div>
                    <span className="text-xl font-bold text-gray-900">
                      R{(300 * paymentMonths.length).toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm">/year</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  For a subject at R300/month
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Quick Start */}
              {subjects.length === 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-800 mb-3">
                    Start with common subjects and adjust prices later.
                  </p>
                  <button
                    onClick={handleCreateDefaultSubjects}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add common subjects'
                    )}
                  </button>
                </div>
              )}

              {/* Subject List */}
              {subjects.length > 0 && (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      {editingSubject?.id === subject.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingSubject.name}
                            onChange={(e) =>
                              setEditingSubject({ ...editingSubject, name: e.target.value })
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
                          />
                          <div className="flex items-center">
                            <span className="text-gray-400 text-sm mr-1">R</span>
                            <input
                              type="number"
                              value={editingSubject.monthly_fee}
                              onChange={(e) =>
                                setEditingSubject({
                                  ...editingSubject,
                                  monthly_fee: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
                            />
                          </div>
                          <button
                            onClick={handleUpdateSubject}
                            disabled={isLoading}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSubject(null)}
                            className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{subject.name}</p>
                            <p className="text-xs text-gray-500">
                              R{subject.monthly_fee}/mo · R{(subject.monthly_fee * paymentMonths.length).toLocaleString()}/yr
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingSubject(subject)}
                              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
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
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                      placeholder="Subject name"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      autoFocus
                    />
                    <div className="flex items-center">
                      <span className="text-gray-400 text-sm mr-1">R</span>
                      <input
                        type="number"
                        value={newSubject.monthly_fee}
                        onChange={(e) =>
                          setNewSubject({ ...newSubject, monthly_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-2 rounded-lg border border-gray-300 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleAddSubject}
                      disabled={isLoading || !newSubject.name.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubject(false)
                        setNewSubject({ name: '', monthly_fee: 300 })
                      }}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddSubject(true)}
                  className="w-full p-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add subject
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            {currentStep > 0 ? (
              <button
                onClick={() => {
                  setCurrentStep(currentStep - 1)
                  setTimeout(() => {
                    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                  }, 100)
                }}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
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
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCompleteSetup}
                disabled={isLoading || subjects.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Complete setup
                    <Check className="w-4 h-4" />
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
