export type TaskStatus = 'Progressing' | 'Approved' | 'Cancelled';

export interface ApproveAssignRecord {
  requestId: string;
  branch: string;
  requestedDate: string;
  requestTask: number;
  base: string;
  responseDate?: string;
  responseTask?: number;
  requestedBy: string;
  status: TaskStatus;
}
