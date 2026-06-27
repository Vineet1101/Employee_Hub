export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      candidates: {
        Row: {
          created_at: string
          current_location: string | null
          current_salary: number
          description: string | null
          email: string | null
          expected_salary: number
          full_name: string
          id: string
          job_role: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          preferred_locations: string[]
          resume_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_location?: string | null
          current_salary?: number
          description?: string | null
          email?: string | null
          expected_salary?: number
          full_name: string
          id?: string
          job_role?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          preferred_locations?: string[]
          resume_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_location?: string | null
          current_salary?: number
          description?: string | null
          email?: string | null
          expected_salary?: number
          full_name?: string
          id?: string
          job_role?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          preferred_locations?: string[]
          resume_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          aadhaar_url: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          base_salary: number
          company: string | null
          created_at: string
          department: string | null
          email: string | null
          employee_code: string
          fitness_certificate_url: string | null
          full_name: string
          id: string
          joining_date: string
          notes: string | null
          owner_id: string
          pan_url: string | null
          phone: string | null
          police_verification_urls: string[]
          position: string | null
          status: string
          updated_at: string
          vendor: string | null
          vendor_commission: number | null
        }
        Insert: {
          aadhaar_url?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          base_salary?: number
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code: string
          fitness_certificate_url?: string | null
          full_name: string
          id?: string
          joining_date: string
          notes?: string | null
          owner_id: string
          pan_url?: string | null
          phone?: string | null
          police_verification_urls?: string[]
          position?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
          vendor_commission?: number | null
        }
        Update: {
          aadhaar_url?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          base_salary?: number
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string
          fitness_certificate_url?: string | null
          full_name?: string
          id?: string
          joining_date?: string
          notes?: string | null
          owner_id?: string
          pan_url?: string | null
          phone?: string | null
          police_verification_urls?: string[]
          position?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
          vendor_commission?: number | null
        }
        Relationships: []
      }
      job_openings: {
        Row: {
          bonus: string | null
          company_name: string | null
          contact: string | null
          created_at: string
          expected_salary: number | null
          hr_name: string | null
          id: string
          location: string | null
          note: string | null
          owner_id: string
          staff_count: number | null
          staff_position: string | null
          updated_at: string
          working_hours: string | null
        }
        Insert: {
          bonus?: string | null
          company_name?: string | null
          contact?: string | null
          created_at?: string
          expected_salary?: number | null
          hr_name?: string | null
          id?: string
          location?: string | null
          note?: string | null
          owner_id: string
          staff_count?: number | null
          staff_position?: string | null
          updated_at?: string
          working_hours?: string | null
        }
        Update: {
          bonus?: string | null
          company_name?: string | null
          contact?: string | null
          created_at?: string
          expected_salary?: number | null
          hr_name?: string | null
          id?: string
          location?: string | null
          note?: string | null
          owner_id?: string
          staff_count?: number | null
          staff_position?: string | null
          updated_at?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          advance: number
          advance_note: string | null
          base_salary: number
          bonus: number
          bonus_note: string | null
          created_at: string
          deductions: number
          deductions_note: string | null
          employee_id: string
          id: string
          net_salary: number
          notes: string | null
          owner_id: string
          paid_at: string | null
          payment_method: string | null
          period_month: number
          period_year: number
          status: string
          updated_at: string
        }
        Insert: {
          advance?: number
          advance_note?: string | null
          base_salary?: number
          bonus?: number
          bonus_note?: string | null
          created_at?: string
          deductions?: number
          deductions_note?: string | null
          employee_id: string
          id?: string
          net_salary?: number
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          payment_method?: string | null
          period_month: number
          period_year: number
          status?: string
          updated_at?: string
        }
        Update: {
          advance?: number
          advance_note?: string | null
          base_salary?: number
          bonus?: number
          bonus_note?: string | null
          created_at?: string
          deductions?: number
          deductions_note?: string | null
          employee_id?: string
          id?: string
          net_salary?: number
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_method?: string | null
          period_month?: number
          period_year?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          access_token: string | null
          account_sid: string | null
          auth_token: string | null
          created_at: string
          from_number: string | null
          owner_id: string
          phone_number_id: string | null
          provider: string
          updated_at: string
          webhook_body_template: string | null
          webhook_headers: Json
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string
          from_number?: string | null
          owner_id: string
          phone_number_id?: string | null
          provider?: string
          updated_at?: string
          webhook_body_template?: string | null
          webhook_headers?: Json
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string
          from_number?: string | null
          owner_id?: string
          phone_number_id?: string | null
          provider?: string
          updated_at?: string
          webhook_body_template?: string | null
          webhook_headers?: Json
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
