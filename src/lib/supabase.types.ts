export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          subscription_end_date: string | null
          subscription_status: string
          tokens_remaining: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          subscription_end_date?: string | null
          subscription_status?: string
          tokens_remaining?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscription_end_date?: string | null
          subscription_status?: string
          tokens_remaining?: number
          updated_at?: string
        }
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
  }
}