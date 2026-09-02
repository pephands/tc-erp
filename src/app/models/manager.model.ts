export interface Manager {
  id: string; // e.g. ATC_7, ATC_8
  fullName: string;
  originalName?: string;
  mobile: string;
  officialNumber?: string;
  gender: 'Male' | 'Female' | 'Other';
  role: string;
  slab?: string;
  branch: string;
  salary?: string;
  dateOfJoining?: string;
  dateOfRelieving?: string;
  email: string;
  bankAccountNumber?: string;
  bankHolderName?: string;
  bankIfscCode?: string;
  address?: string;
  aadharImage?: string;
  otpDetails: string;
  status: 'Active' | 'Inactive';
}

export const MOCK_MANAGERS: Manager[] = [
  { 
    id: 'ATC_7', 
    fullName: 'KARTHICK', 
    originalName: 'KARTHICK RAJA', 
    mobile: '988472819', 
    officialNumber: '9876543210', 
    gender: 'Male', 
    email: 'adambakkam.cdc@allthechildrentrust.org', 
    role: 'Team Lead', 
    slab: 'Slab A', 
    branch: 'ADAMBAKKAM', 
    salary: '0', 
    dateOfJoining: '1970-01-01 00:00:00', 
    dateOfRelieving: '1970-01-01 00:00:00', 
    bankAccountNumber: '', 
    bankHolderName: '', 
    bankIfscCode: '', 
    address: 'Adambakkam Main Road, Chennai', 
    otpDetails: '1046940637', 
    status: 'Active' 
  },
  { 
    id: 'ATC_8', 
    fullName: 'SANTHOSH', 
    originalName: 'SANTHOSH KUMAR', 
    mobile: '9876543210', 
    officialNumber: '9876543211', 
    gender: 'Male', 
    email: 'ambathur.cdc@allthechildrentrust.org', 
    role: 'Team Lead', 
    slab: 'Slab A', 
    branch: 'AMBATHUR', 
    salary: '0', 
    dateOfJoining: '1970-01-01 00:00:00', 
    dateOfRelieving: '1970-01-01 00:00:00', 
    otpDetails: '794994253', 
    status: 'Active' 
  },
  { id: 'ATC_9', fullName: 'SEKAR', mobile: '9876543210', gender: 'Male', email: 'arumbakkam.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'ARUMBAKKAM', otpDetails: '1607570628', status: 'Active' },
  { id: 'ATC_10', fullName: 'VASANTHA KUMAR', mobile: '9876543210', gender: 'Male', email: 'perambur.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'PERAMBUR', otpDetails: '1928673513', status: 'Active' },
  { id: 'ATC_11', fullName: 'NANDHA KUMAR', mobile: '9876543210', gender: 'Male', email: 'redhills.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'REDHILLS', otpDetails: '473470647', status: 'Active' },
  { id: 'ATC_12', fullName: 'KAMALAKANNAN', mobile: '9876543210', gender: 'Male', email: 'tambaram.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'TAMBARAM', otpDetails: '884542895', status: 'Active' },
  { id: 'ATC_13', fullName: 'SARAVANAN', mobile: '9876543210', gender: 'Male', email: 'teynampet.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'TEYNAMPET', otpDetails: '1945150731', status: 'Active' },
  { id: 'ATC_33', fullName: 'RAJASEKAR', mobile: '9600057285', gender: 'Male', email: 'salem.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'SALEM', otpDetails: '1089537259', status: 'Active' },
  { id: 'ATC_40', fullName: 'VINOTH', mobile: '7205049200', gender: 'Male', email: 'karaikal.cdc@allthechildrentrust.org', role: 'Team Lead', branch: 'KARAIKAL', otpDetails: '1530742515', status: 'Active' },
  { id: 'ATC_695', fullName: 'MUTHU', mobile: '9500120031', gender: 'Male', email: 'pickup.atc@gmail.com', role: 'Team Lead', branch: 'PICKUP ATC', otpDetails: '776818978', status: 'Active' }
];
