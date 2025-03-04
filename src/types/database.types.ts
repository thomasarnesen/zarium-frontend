export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          tokens_remaining: number
          subscription_status: string
          subscription_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          tokens_remaining?: number
          subscription_status?: string
          subscription_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          tokens_remaining?: number
          subscription_status?: string
          subscription_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      excel_requests: {
        Row: {
          id: string
          user_id: string
          prompt: string
          status: string
          file_url: string | null
          preview_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          status?: string
          file_url?: string | null
          preview_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          status?: string
          file_url?: string | null
          preview_url?: string | null
          created_at?: string
        }
      }
      token_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          created_at?: string
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