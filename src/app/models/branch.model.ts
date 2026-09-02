export interface Branch {
  id: number;
  name: string;
  shortForm: string;
  phone: string;
  address: string;
  isHidden: boolean;
}

export const MOCK_BRANCHES: Branch[] = [
  { id: 1, name: 'ADAMBAKKAM', shortForm: 'ADM', phone: '9876543210', address: 'NA', isHidden: false },
  { id: 2, name: 'AMBATHUR', shortForm: 'AMB', phone: '9876543210', address: 'NA', isHidden: false },
  { id: 3, name: 'ARUMBAKKAM', shortForm: 'ARM', phone: '9876543210', address: 'NA', isHidden: false },
  { id: 4, name: 'PERAMBUR', shortForm: 'PRM', phone: '9876543210', address: 'NA', isHidden: false },
  { id: 5, name: 'REDHILLS', shortForm: 'RED', phone: '9876543210', address: 'NA', isHidden: true },
  { id: 6, name: 'TAMBARAM', shortForm: 'TAM', phone: '9876543210', address: 'NA', isHidden: false },
  { id: 7, name: 'TEYNAMPET', shortForm: 'TEY', phone: '9876543210', address: 'NA', isHidden: false },
  { id: 26, name: 'SALEM', shortForm: 'SLM', phone: '9600057285', address: 'NIL', isHidden: true },
  { id: 29, name: 'KARAIKAL', shortForm: 'KAR', phone: '7205049200', address: 'NIL', isHidden: false },
  { id: 30, name: 'PICKUP ATC', shortForm: 'PIC', phone: '9500120031', address: 'KARAPAKKAM', isHidden: false },
  { id: 31, name: 'VELACHERY', shortForm: 'VEL', phone: '9876501234', address: '100 Feet Road, Velachery', isHidden: false },
  { id: 32, name: 'ANNANAGAR', shortForm: 'ANN', phone: '9876512345', address: '2nd Avenue, Anna Nagar', isHidden: false },
  { id: 33, name: 'PORUR', shortForm: 'POR', phone: '9876523456', address: 'Mount Poonamallee Road', isHidden: false },
  { id: 34, name: 'GUINDY', shortForm: 'GND', phone: '9876534567', address: 'GST Road, Guindy', isHidden: false },
  { id: 35, name: 'MADIPAKKAM', shortForm: 'MAD', phone: '9876545678', address: 'Medavakkam Main Road', isHidden: false },
  { id: 36, name: 'CHROMEPET', shortForm: 'CHR', phone: '9876556789', address: 'Station Road, Chromepet', isHidden: false },
  { id: 37, name: 'MYLAPORE', shortForm: 'MYL', phone: '9876567890', address: 'Luz Church Road', isHidden: false },
  { id: 38, name: 'THIRUVANMIYUR', shortForm: 'TVM', phone: '9876578901', address: 'ECR Main Road', isHidden: false },
  { id: 39, name: 'NUNGAMBAKKAM', shortForm: 'NGM', phone: '9876589012', address: 'High Road, Nungambakkam', isHidden: false },
  { id: 40, name: 'COIMBATORE', shortForm: 'CBE', phone: '9876590123', address: 'Avinashi Road', isHidden: false },
  { id: 41, name: 'MADURAI', shortForm: 'MDU', phone: '9876509876', address: 'KK Nagar, Madurai', isHidden: false },
  { id: 42, name: 'TRICHY', shortForm: 'TRY', phone: '9876598765', address: 'Cantonment, Trichy', isHidden: false },
  { id: 43, name: 'TIRUPUR', shortForm: 'TPR', phone: '9876587654', address: 'PN Road, Tirupur', isHidden: false },
  { id: 44, name: 'ERODE', shortForm: 'ERD', phone: '9876576543', address: 'Brough Road, Erode', isHidden: false },
  { id: 45, name: 'VELLORE', shortForm: 'VEL', phone: '9876565432', address: 'Katpadi Road, Vellore', isHidden: false }
];
