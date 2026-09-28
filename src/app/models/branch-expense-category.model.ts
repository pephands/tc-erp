export interface BranchExpenseCategory {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function deserializeBranchExpenseCategory(data: any): BranchExpenseCategory {
  return {
    id: data.id,
    name: data.name,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
