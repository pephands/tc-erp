export type UserRole = 'ADMIN' | 'TL' | 'TC';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
  phone: string;
  department: string;
}

export interface AuthSession {
  user: User;
  token: string;
  loginTime: string;
}

export const MOCK_USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: 'admin123',
    user: {
      id: 'usr_admin_01',
      username: 'admin',
      name: 'Alexander Pierce',
      role: 'ADMIN',
      email: 'admin.alex@tcerp.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+91 98765 43210',
      department: 'Executive Management'
    }
  },
  tl_rajesh: {
    password: 'tl123',
    user: {
      id: 'usr_tl_02',
      username: 'tl_rajesh',
      name: 'Rajesh Kumar',
      role: 'TL',
      email: 'rajesh.tl@tcerp.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      phone: '+91 98123 45678',
      department: 'Outbound Operations Team A'
    }
  },
  tc_priya: {
    password: 'tc123',
    user: {
      id: 'usr_tc_03',
      username: 'tc_priya',
      name: 'Priya Sharma',
      role: 'TC',
      email: 'priya.tc@tcerp.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      phone: '+91 97654 32109',
      department: 'Lead Generation Telecalling'
    }
  }
};
