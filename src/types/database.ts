export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type UserRole = 'super_admin' | 'center_admin' | 'center_staff'
export type CenterStatus = 'active' | 'inactive' | 'suspended'
export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'withdrawn'
export type TeacherStatus = 'active' | 'inactive' | 'terminated'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type Gender = 'male' | 'female' | 'other'
export type RoomType = 'single' | 'shared'
export type HostelStudentStatus = 'checked_in' | 'checked_out'

export interface Database {
  public: {
    Tables: {
      tutorial_centers: {
        Row: {
          id: string
          name: string
          slug: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          logo_url: string | null
          primary_color: string
          secondary_color: string
          bank_name: string | null
          account_number: string | null
          branch_code: string | null
          status: CenterStatus
          subscription_tier: string
          subscription_start_date: string | null
          subscription_end_date: string | null
          hostel_module_enabled: boolean
          transport_module_enabled: boolean
          library_module_enabled: boolean
          sms_module_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          bank_name?: string | null
          account_number?: string | null
          branch_code?: string | null
          status?: CenterStatus
          subscription_tier?: string
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          hostel_module_enabled?: boolean
          transport_module_enabled?: boolean
          library_module_enabled?: boolean
          sms_module_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          bank_name?: string | null
          account_number?: string | null
          branch_code?: string | null
          status?: CenterStatus
          subscription_tier?: string
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          hostel_module_enabled?: boolean
          transport_module_enabled?: boolean
          library_module_enabled?: boolean
          sms_module_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          center_id: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: UserRole
          center_id?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          center_id?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }
      subjects: {
        Row: {
          id: string
          center_id: string
          name: string
          code: string | null
          description: string | null
          monthly_fee: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          name: string
          code?: string | null
          description?: string | null
          monthly_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          name?: string
          code?: string | null
          description?: string | null
          monthly_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          center_id: string
          full_name: string
          email: string | null
          phone: string | null
          gender: Gender | null
          date_of_birth: string | null
          address: string | null
          employee_id: string | null
          qualification: string | null
          specialization: string | null
          date_joined: string | null
          status: TeacherStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          address?: string | null
          employee_id?: string | null
          qualification?: string | null
          specialization?: string | null
          date_joined?: string | null
          status?: TeacherStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          address?: string | null
          employee_id?: string | null
          qualification?: string | null
          specialization?: string | null
          date_joined?: string | null
          status?: TeacherStatus
          created_at?: string
          updated_at?: string
        }
      }
      teacher_subjects: {
        Row: {
          id: string
          teacher_id: string
          subject_id: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          subject_id: string
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          subject_id?: string
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          center_id: string
          student_number: string | null
          full_name: string
          surname: string | null
          first_name: string | null
          email: string | null
          phone: string | null
          gender: Gender | null
          date_of_birth: string | null
          id_number: string | null
          grade: string | null
          school_name: string | null
          address: string | null
          health_conditions: string | null
          photo_url: string | null
          // Parent/Guardian
          parent_name: string | null
          parent_phone: string | null
          parent_email: string | null
          parent_address: string | null
          relationship: string | null
          // Person responsible for payment
          payer_name: string | null
          payer_id_number: string | null
          payer_phone: string | null
          payer_relationship: string | null
          // Registration fee
          registration_fee_paid: boolean
          registration_fee_amount: number
          registration_fee_paid_date: string | null
          // Terms
          terms_accepted: boolean
          terms_accepted_date: string | null
          status: StudentStatus
          registration_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          student_number?: string | null
          full_name: string
          surname?: string | null
          first_name?: string | null
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          id_number?: string | null
          grade?: string | null
          school_name?: string | null
          address?: string | null
          health_conditions?: string | null
          photo_url?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          parent_address?: string | null
          relationship?: string | null
          payer_name?: string | null
          payer_id_number?: string | null
          payer_phone?: string | null
          payer_relationship?: string | null
          registration_fee_paid?: boolean
          registration_fee_amount?: number
          registration_fee_paid_date?: string | null
          terms_accepted?: boolean
          terms_accepted_date?: string | null
          status?: StudentStatus
          registration_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          student_number?: string | null
          full_name?: string
          surname?: string | null
          first_name?: string | null
          email?: string | null
          phone?: string | null
          gender?: Gender | null
          date_of_birth?: string | null
          id_number?: string | null
          grade?: string | null
          school_name?: string | null
          address?: string | null
          health_conditions?: string | null
          photo_url?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          parent_address?: string | null
          relationship?: string | null
          payer_name?: string | null
          payer_id_number?: string | null
          payer_phone?: string | null
          payer_relationship?: string | null
          registration_fee_paid?: boolean
          registration_fee_amount?: number
          registration_fee_paid_date?: string | null
          terms_accepted?: boolean
          terms_accepted_date?: string | null
          status?: StudentStatus
          registration_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      student_subjects: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          enrolled_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          subject_id: string
          enrolled_date?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string
          enrolled_date?: string
          is_active?: boolean
          created_at?: string
        }
      }
      fee_structures: {
        Row: {
          id: string
          center_id: string
          name: string
          description: string | null
          amount: number
          fee_type: string
          is_recurring: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          name: string
          description?: string | null
          amount: number
          fee_type: string
          is_recurring?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          name?: string
          description?: string | null
          amount?: number
          fee_type?: string
          is_recurring?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      student_fees: {
        Row: {
          id: string
          center_id: string
          student_id: string
          fee_month: string
          fee_type: string
          amount_due: number
          amount_paid: number
          balance: number
          status: PaymentStatus
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          student_id: string
          fee_month: string
          fee_type: string
          amount_due: number
          amount_paid?: number
          status?: PaymentStatus
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          student_id?: string
          fee_month?: string
          fee_type?: string
          amount_due?: number
          amount_paid?: number
          status?: PaymentStatus
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          center_id: string
          student_id: string
          student_fee_id: string | null
          amount: number
          payment_method: string | null
          reference_number: string | null
          notes: string | null
          recorded_by: string | null
          payment_date: string
          created_at: string
        }
        Insert: {
          id?: string
          center_id: string
          student_id: string
          student_fee_id?: string | null
          amount: number
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          recorded_by?: string | null
          payment_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          student_id?: string
          student_fee_id?: string | null
          amount?: number
          payment_method?: string | null
          reference_number?: string | null
          notes?: string | null
          recorded_by?: string | null
          payment_date?: string
          created_at?: string
        }
      }
      hostel_blocks: {
        Row: {
          id: string
          center_id: string
          name: string
          description: string | null
          gender_restriction: Gender | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          name: string
          description?: string | null
          gender_restriction?: Gender | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          name?: string
          description?: string | null
          gender_restriction?: Gender | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hostel_rooms: {
        Row: {
          id: string
          center_id: string
          block_id: string | null
          room_number: string
          room_type: RoomType
          capacity: number
          current_occupancy: number
          monthly_fee: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          block_id?: string | null
          room_number: string
          room_type?: RoomType
          capacity?: number
          current_occupancy?: number
          monthly_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          block_id?: string | null
          room_number?: string
          room_type?: RoomType
          capacity?: number
          current_occupancy?: number
          monthly_fee?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hostel_allocations: {
        Row: {
          id: string
          center_id: string
          room_id: string
          student_id: string
          check_in_date: string
          check_out_date: string | null
          status: HostelStudentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          center_id: string
          room_id: string
          student_id: string
          check_in_date?: string
          check_out_date?: string | null
          status?: HostelStudentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          center_id?: string
          room_id?: string
          student_id?: string
          check_in_date?: string
          check_out_date?: string | null
          status?: HostelStudentStatus
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          center_id: string | null
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          center_id?: string | null
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          center_id?: string | null
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_center_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      center_status: CenterStatus
      student_status: StudentStatus
      teacher_status: TeacherStatus
      payment_status: PaymentStatus
      gender: Gender
      room_type: RoomType
      hostel_student_status: HostelStudentStatus
    }
  }
}

// Helper types for easier usage
export type TutorialCenter = Database['public']['Tables']['tutorial_centers']['Row']
export type TutorialCenterInsert = Database['public']['Tables']['tutorial_centers']['Insert']
export type TutorialCenterUpdate = Database['public']['Tables']['tutorial_centers']['Update']

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export type Teacher = Database['public']['Tables']['teachers']['Row']
export type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
export type TeacherUpdate = Database['public']['Tables']['teachers']['Update']

export type Subject = Database['public']['Tables']['subjects']['Row']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
export type SubjectUpdate = Database['public']['Tables']['subjects']['Update']

export type StudentFee = Database['public']['Tables']['student_fees']['Row']
export type StudentFeeInsert = Database['public']['Tables']['student_fees']['Insert']
export type StudentFeeUpdate = Database['public']['Tables']['student_fees']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type HostelRoom = Database['public']['Tables']['hostel_rooms']['Row']
export type HostelRoomInsert = Database['public']['Tables']['hostel_rooms']['Insert']
export type HostelRoomUpdate = Database['public']['Tables']['hostel_rooms']['Update']

export type HostelAllocation = Database['public']['Tables']['hostel_allocations']['Row']
export type HostelAllocationInsert = Database['public']['Tables']['hostel_allocations']['Insert']
export type HostelAllocationUpdate = Database['public']['Tables']['hostel_allocations']['Update']
