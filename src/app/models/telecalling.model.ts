export interface MasterDonorRecord {
  id: number;
  donorName: string;
  phoneNumber: string;
  dob?: string;
  category: 'BASE' | 'NON BASE' | 'NON_BASE';
  status: 'UNASSIGNED' | 'APPROVED_TO_BRANCH' | 'ASSIGNED_TO_TC' | 'COMPLETED' | 'ARCHIVED';
  currentBranch?: number;
  currentBranchName?: string;
  currentBranchCode?: string;
  assignedTc?: number;
  assignedTcName?: string;
  assignedBranchAt?: string;
  assignedTcAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchAllocationRequestRecord {
  id: number;
  branch: number;
  branchName?: string;
  branchCode?: string;
  requestedBy: number;
  requestedByName?: string;
  category: 'BASE' | 'NON BASE' | 'NON_BASE';
  requestedQuantity: number;
  approvedQuantity?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchStatSummary {
  branch_id: number;
  branch_code: string;
  branch_name: string;
  total_approved: number;
  assigned_tc_count: number;
  completed_count: number;
  unused_count: number;
}

export interface MasterSummaryData {
  unallocated_base_count: number;
  unallocated_non_base_count: number;
  total_base_count: number;
  total_non_base_count: number;
  branches: BranchStatSummary[];
}

export interface TelecallerUserOption {
  id: number;
  username: string;
  full_name: string;
  branch_name?: string;
}

export interface BranchPoolData {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  unused_base_count: number;
  unused_non_base_count: number;
  total_unused_count: number;
  assigned_tc_count: number;
  completed_count: number;
  total_branch_count: number;
}

export interface CallLogRecord {
  id: number;
  telecallingData: number;
  donorPhone?: string;
  telecaller: number;
  telecallerName?: string;
  branch: number;
  callDisposition: string;
  remarks: string;
  updatedDonorName?: string;
  updatedDob?: string;
  calledAt: string;
}

export function deserializeMasterDonor(json: any): MasterDonorRecord {
  return {
    id: json.id,
    donorName: json.donor_name || '',
    phoneNumber: json.phone_number || '',
    dob: json.dob || undefined,
    category: json.category || 'BASE',
    status: json.status || 'UNASSIGNED',
    currentBranch: json.current_branch || undefined,
    currentBranchName: json.current_branch_name || undefined,
    currentBranchCode: json.current_branch_code || undefined,
    assignedTc: json.assigned_tc || undefined,
    assignedTcName: json.assigned_tc_name || undefined,
    assignedBranchAt: json.assigned_branch_at || undefined,
    assignedTcAt: json.assigned_tc_at || undefined,
    createdAt: json.created_at || undefined,
    updatedAt: json.updated_at || undefined,
  };
}

export function deserializeAllocationRequest(json: any): BranchAllocationRequestRecord {
  return {
    id: json.id,
    branch: json.branch,
    branchName: json.branch_name || undefined,
    branchCode: json.branch_code || undefined,
    requestedBy: json.requested_by,
    requestedByName: json.requested_by_name || undefined,
    category: json.category || 'BASE',
    requestedQuantity: json.requested_quantity || 0,
    approvedQuantity: json.approved_quantity || undefined,
    status: json.status || 'PENDING',
    approvedBy: json.approved_by || undefined,
    approvedByName: json.approved_by_name || undefined,
    approvedAt: json.approved_at || undefined,
    createdAt: json.created_at || undefined,
    updatedAt: json.updated_at || undefined,
  };
}
