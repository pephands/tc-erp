export interface FeedbackRecord {
  id: number;
  telecaller: number;
  telecaller_name?: string;
  telecaller_username?: string;
  branch?: number;
  branch_name?: string;
  subject: string;
  category: 'TL_CONCERN' | 'BRANCH_ENVIRONMENT' | 'INFRA_WORKSTATION' | 'SYSTEM_BUG' | 'OTHER';
  message: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}
