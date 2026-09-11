export interface BranchDocumentRecord {
  id: string | number;
  createdDate: string;
  documentName: string;
  fileName: string;
  fileUrl?: string;
  branchId?: number | string;
  branchName: string;
  expiryDate: string;
  isActive?: boolean;
}

export interface BranchDocumentApiResponse {
  id: number;
  name: string;
  branch: number;
  branch_name: string;
  document: string | null;
  file_name: string;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function deserializeBranchDocument(api: BranchDocumentApiResponse): BranchDocumentRecord {
  let createdDateStr = '';
  if (api.created_at) {
    const created = new Date(api.created_at);
    if (!isNaN(created.getTime())) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      createdDateStr = `${String(created.getDate()).padStart(2, '0')}-${months[created.getMonth()]}-${created.getFullYear()}`;
    }
  }

  let expiryStr = api.expiry_date || '';
  if (expiryStr && expiryStr.includes('-')) {
    const parts = expiryStr.split('-');
    if (parts.length === 3) {
      const expDate = new Date(expiryStr);
      if (!isNaN(expDate.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        expiryStr = `${String(expDate.getDate()).padStart(2, '0')}-${months[expDate.getMonth()]}-${expDate.getFullYear()}`;
      }
    }
  }

  const rawDoc = api.document || '';
  const parsedFileName = api.file_name || (rawDoc ? rawDoc.split('/').pop() || '' : '');

  return {
    id: api.id,
    createdDate: createdDateStr || api.created_at || '',
    documentName: api.name || '',
    fileName: parsedFileName,
    fileUrl: rawDoc,
    branchId: api.branch,
    branchName: api.branch_name || '',
    expiryDate: expiryStr || api.expiry_date || '',
    isActive: api.is_active
  };
}
