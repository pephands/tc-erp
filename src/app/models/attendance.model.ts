export interface AttendanceRecord {
  id: string;
  branchName: string;
  tcId: string;
  tcName: string;
  tcDetails: string; // e.g. "2418-JAYANTHI"
  attendanceDate: string; // e.g. "2026-09-02"
  status: 'Present' | 'Absent' | 'WFH' | string;
  inTime?: string;
  outTime?: string;
  originalItem?: any;
}
