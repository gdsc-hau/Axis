export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          student_id: string
          gdg_id: string
          full_name: string
          email: string
          program: string
          department: string
          role: string
          is_accepted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          gdg_id: string
          full_name: string
          email: string
          program: string
          department: string
          role?: string
          is_accepted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          gdg_id?: string
          full_name?: string
          email?: string
          program?: string
          department?: string
          role?: string
          is_accepted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // Note: Run `supabase gen types typescript` to generate the full typings automatically.
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
