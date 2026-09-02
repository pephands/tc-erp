export interface AttendanceRecord {
  id: string;
  branchName: string;
  tcId: string;
  tcName: string;
  tcDetails: string; // e.g. "2418-JAYANTHI"
  attendanceDate: string; // e.g. "2026-09-02"
  status: 'Present' | 'Absent' | 'WFH';
}

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'ATT_101', branchName: '26-SALEM', tcId: '2418', tcName: 'JAYANTHI', tcDetails: '2418-JAYANTHI', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_102', branchName: '36-KARAPAKKAM TRUST', tcId: '2392', tcName: 'CHINRASU', tcDetails: '2392-CHINRASU', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_103', branchName: '43-CHEYYAR', tcId: '2391', tcName: 'SHAMILI', tcDetails: '2391-SHAMILI', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_104', branchName: '43-CHEYYAR', tcId: '2390', tcName: 'RIYA', tcDetails: '2390-RIYA', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_105', branchName: '5-REDHILLS', tcId: '2381', tcName: 'POOJA', tcDetails: '2381-POOJA', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_106', branchName: '33-ADMIN', tcId: '2378', tcName: 'S.MUKESH', tcDetails: '2378-S.MUKESH', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_107', branchName: '54-ATC TRICHY TRUST', tcId: '2377', tcName: 'SANKARA MANI', tcDetails: '2377-SANKARA MANI', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_108', branchName: '39-VYASARPADI TRUST', tcId: '2375', tcName: 'LEON SIMON', tcDetails: '2375-LEON SIMON', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_109', branchName: '36-KARAPAKKAM TRUST', tcId: '2374', tcName: 'SETHIL KUMAR', tcDetails: '2374-SETHIL KUMAR', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_110', branchName: '43-CHEYYAR', tcId: '2372', tcName: 'VALARMATHI', tcDetails: '2372-VALARMATHI', attendanceDate: '2026-09-02', status: 'WFH' },
  { id: 'ATT_111', branchName: '1-ADAMBAKKAM', tcId: '2365', tcName: 'KARTHIK', tcDetails: '2365-KARTHIK', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_112', branchName: '1-ADAMBAKKAM', tcId: '2360', tcName: 'PRIYA', tcDetails: '2360-PRIYA', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_113', branchName: '2-AMBATHUR', tcId: '2355', tcName: 'SURESH', tcDetails: '2355-SURESH', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_114', branchName: '2-AMBATHUR', tcId: '2350', tcName: 'ANITHA', tcDetails: '2350-ANITHA', attendanceDate: '2026-09-02', status: 'WFH' },
  { id: 'ATT_115', branchName: '3-PERAMBUR', tcId: '2345', tcName: 'DINESH', tcDetails: '2345-DINESH', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_116', branchName: '3-PERAMBUR', tcId: '2340', tcName: 'GOWRI', tcDetails: '2340-GOWRI', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_117', branchName: '4-TAMBARAM', tcId: '2335', tcName: 'KAVITHA', tcDetails: '2335-KAVITHA', attendanceDate: '2026-09-02', status: 'Absent' },
  { id: 'ATT_118', branchName: '4-TAMBARAM', tcId: '2330', tcName: 'MANOJ', tcDetails: '2330-MANOJ', attendanceDate: '2026-09-02', status: 'Present' },
  { id: 'ATT_119', branchName: '26-SALEM', tcId: '2325', tcName: 'RAMESH', tcDetails: '2325-RAMESH', attendanceDate: '2026-09-02', status: 'WFH' },
  { id: 'ATT_120', branchName: '26-SALEM', tcId: '2320', tcName: 'SARAVANAN', tcDetails: '2320-SARAVANAN', attendanceDate: '2026-09-02', status: 'Present' }
];
