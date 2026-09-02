export interface Telecaller {
  id: string; // e.g. ADM_104, ADM_105
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

export const MOCK_TELECALLERS: Telecaller[] = [
  { 
    id: 'ADM_104', 
    fullName: 'ABI', 
    personalNo: '8870282618', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: false 
  },
  { 
    id: 'ADM_105', 
    fullName: 'ALIYA', 
    personalNo: '7395949844', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: true 
  },
  { 
    id: 'ADM_106', 
    fullName: 'ANITHA', 
    personalNo: '9876543210', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: false 
  },
  { 
    id: 'ADM_107', 
    fullName: 'ARCHANA', 
    personalNo: '8754096271', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: false 
  },
  { 
    id: 'ADM_108', 
    fullName: 'ARUNA', 
    personalNo: '6380014503', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: true 
  },
  { 
    id: 'ADM_109', 
    fullName: 'CHITRA', 
    originalName: 'M.CHITRA DEVI', 
    personalNo: '9962056524', 
    officialNo: '9087020436', 
    gender: 'Female', 
    role: 'Tele Caller',
    slab: 'SLAB-5',
    salary: '11000',
    dateOfJoining: '2022-09-19 00:00:00',
    dateOfRelieving: '1970-01-01 00:00:00',
    email: '',
    bankAccountNumber: "'100048703403",
    bankHolderName: 'M.CHITHRA DEVI',
    bankIfscCode: 'ESFB0001139',
    address: '612862091661 - W/O : MOORTHY 18, BARATHIYAR STREET MEENAMBAKKAM KANCHIPURAM TAMILNADU-600027',
    status: 'Active', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: true 
  },
  { 
    id: 'ADM_110', 
    fullName: 'DEEPA', 
    personalNo: '8428511915', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: true 
  },
  { 
    id: 'ADM_111', 
    fullName: 'EZHIL', 
    personalNo: '9876543210', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: false 
  },
  { 
    id: 'ADM_112', 
    fullName: 'JANCY', 
    originalName: 'PREETHI JOSEPH MOHAN', 
    personalNo: '7338934353', 
    officialNo: '9087020551', 
    gender: 'Female', 
    role: 'Tele Caller',
    slab: 'SLAB-4',
    salary: '12500',
    dateOfJoining: '2021-05-10 00:00:00',
    dateOfRelieving: '1970-01-01 00:00:00',
    bankAccountNumber: "'100098471204",
    bankHolderName: 'PREETHI JOSEPH MOHAN',
    bankIfscCode: 'ESFB0001139',
    address: 'Tambaram Main Road, Chennai',
    status: 'Active', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: true 
  },
  { 
    id: 'ADM_113', 
    fullName: 'JAYACHITRA', 
    personalNo: '7338940448', 
    gender: 'Female', 
    role: 'Tele Caller',
    status: 'InActive', 
    branch: 'ADAMBAKKAM', 
    loginTime: '09:00 AM', 
    logOffTime: '06:00 PM', 
    hasAadhar: true 
  }
];
