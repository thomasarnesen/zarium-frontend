import { Database } from './database.types'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Add specific table types
export type Profile = Tables<'profiles'>
export type ExcelRequest = Tables<'excel_requests'>
export type TokenTransaction = Tables<'token_transactions'>


