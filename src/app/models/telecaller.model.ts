export interface Telecaller {
  id: string; // e.g. ADM_104, ADM_105
  rawId?: number | string;
  fullName: string;
  originalName?: string;
  personalNo: string;
  officialNo?: string;
  gender: 'Female' | 'Male';
  role?: string;
  slab?: string;
  salary?: string;
  dateOfJoining?: string;
  dateOfRelieving?: string;
  email?: string;
  bankAccountNumber?: string;
  bankHolderName?: string;
  bankIfscCode?: string;
  address?: string;
  status: 'Active' | 'InActive';
  branch: string;
  loginTime: string;
  logOffTime: string;
  hasAadhar: boolean;
}
