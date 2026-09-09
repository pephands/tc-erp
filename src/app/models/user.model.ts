export interface Role {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface User {
  id: number | string;
  username: string;
  phone?: string;
  office_phone?: string;
  email: string;
  full_name: string;
  avatar?: string;
  branch?: Branch;
  roles: Role[];
  shift_start_time?: string;
  shift_end_time?: string;
  is_password_reset_required?: boolean;
  is_active: boolean;
  is_staff: boolean;
  date_joined?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  loginTime: string;
}
