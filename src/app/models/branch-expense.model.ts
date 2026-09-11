export interface BranchExpenseRecord {
  id: string | number;
  date: string;
  expenseName: string;
  amount: number;
  remarks: string;
  branchId?: number | string;
  branchName: string;
  fileUrl?: string;
  fileName?: string;
  isActive?: boolean;
  createdDate?: string;
}

export interface BranchExpenseApiResponse {
  id: number;
  date: string;
  expense_name: string;
  amount: string | number;
  remarks: string | null;
  branch: number;
  branch_name: string;
  file: string | null;
  file_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function deserializeBranchExpense(api: BranchExpenseApiResponse): BranchExpenseRecord {
  let createdDateStr = '';
  if (api.created_at) {
    const created = new Date(api.created_at);
    if (!isNaN(created.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      createdDateStr = `${String(created.getDate()).padStart(2, '0')}-${months[created.getMonth()]}-${created.getFullYear()}`;
    }
  }

  const rawFile = api.file || '';
  const parsedFileName = api.file_name || (rawFile ? rawFile.split('/').pop() || '' : '');

  return {
    id: api.id,
    date: api.date || '',
    expenseName: api.expense_name || '',
    amount: typeof api.amount === 'number' ? api.amount : parseFloat(api.amount || '0'),
    remarks: api.remarks || '',
    branchId: api.branch,
    branchName: api.branch_name || '',
    fileUrl: rawFile,
    fileName: parsedFileName,
    isActive: api.is_active,
    createdDate: createdDateStr || api.created_at || '',
  };
}
