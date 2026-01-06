// Re-export all database types
export * from './database'

// Extended types with relations
export interface UserWithCenter {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: 'super_admin' | 'center_admin' | 'center_staff'
  center_id: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  center?: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    primary_color: string
    secondary_color: string
    status: 'active' | 'inactive' | 'suspended'
    hostel_module_enabled: boolean
    transport_module_enabled: boolean
    library_module_enabled: boolean
    sms_module_enabled: boolean
  } | null
}

export interface StudentWithSubjects {
  id: string
  center_id: string
  student_number: string | null
  full_name: string
  email: string | null
  phone: string | null
  gender: 'male' | 'female' | 'other' | null
  date_of_birth: string | null
  grade: string | null
  school_name: string | null
  address: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  parent_address: string | null
  relationship: string | null
  status: 'active' | 'inactive' | 'graduated' | 'withdrawn'
  registration_date: string
  created_at: string
  updated_at: string
  subjects?: {
    id: string
    name: string
    code: string | null
    monthly_fee: number
  }[]
  fees?: {
    id: string
    fee_month: string
    amount_due: number
    amount_paid: number
    balance: number
    status: 'paid' | 'partial' | 'unpaid'
  }[]
}

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  totalSubjects: number
  totalFeesCollected: number
  totalOutstanding: number
  recentPayments: {
    id: string
    student_name: string
    amount: number
    payment_date: string
  }[]
  studentsByGender: {
    male: number
    female: number
    other: number
  }
  paymentStatusBreakdown: {
    paid: number
    partial: number
    unpaid: number
  }
}

export interface HostelStats {
  totalRooms: number
  occupiedRooms: number
  availableRooms: number
  totalCapacity: number
  currentOccupancy: number
  hostelStudents: number
  hostelFeesCollected: number
  hostelOutstanding: number
}

// Form types
export interface StudentFormData {
  full_name: string
  email?: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  grade?: string
  school_name?: string
  address?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  parent_address?: string
  relationship?: string
  subject_ids?: string[]
}

export interface TeacherFormData {
  full_name: string
  email?: string
  phone?: string
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  address?: string
  qualification?: string
  specialization?: string
  date_joined?: string
  subject_ids?: string[]
}

export interface CenterFormData {
  name: string
  slug: string
  email?: string
  phone?: string
  address?: string
  city?: string
  bank_name?: string
  account_number?: string
  branch_code?: string
  subscription_tier?: string
  hostel_module_enabled?: boolean
  transport_module_enabled?: boolean
  library_module_enabled?: boolean
  sms_module_enabled?: boolean
}

export interface PaymentFormData {
  student_id: string
  student_fee_id?: string
  amount: number
  payment_method?: string
  reference_number?: string
  notes?: string
}
