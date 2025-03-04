export interface User {
  id: string;
  email: string;
  tokens_remaining: number;
  subscription_status: 'active' | 'inactive';
  subscription_end_date: string;
  plan_type: 'Basic' | 'Plus' | 'Pro';  // Legg til dette
  token: string;  // Legg til dette
}

export interface ExcelRequest {
  id: string;
  user_id: string;
  prompt: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  file_url?: string;
  preview_url?: string;
}

export interface MacroDefinition {
  name: string;
  code: string;
  description: string;
  input_schema: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'date';
    description: string;
    required: boolean;
  }>;
}

export interface ExcelFile {
  id: string;
  name: string;
  sheets: ExcelSheet[];
  macros: MacroDefinition[];
}

export interface ExcelSheet {
  name: string;
  data: any[][];
  columns: string[];
}
