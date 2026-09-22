export interface BranchIP {
  id?: number;
  ip_address: string;
  label: string;
  is_active?: boolean;
}

export interface Branch {
  id: number;
  branch_id?: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters?: number;
  ip_validation_enabled?: boolean;
  location_validation_enabled?: boolean;
  is_active: boolean;
  status?: string;
  allowed_ips?: BranchIP[];
  created_at?: string;
  updated_at?: string;
}
