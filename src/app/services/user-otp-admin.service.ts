import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

export interface UserOTPRecord {
  id: number;
  user_id: number;
  branch_name: string;
  branch_id?: number | null;
  employee_name: string;
  employee_id: string;
  otp_code: string;
  is_valid: boolean;
  created_at: string;
  expires_at: string;
  expires_in_seconds: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserOtpAdminService extends BaseHttpService {
  isModalOpen = signal<boolean>(false);

  constructor(
    public endPoint: Endpoint,
    public injector: Injector,
  ) {
    super(injector);
  }

  get isAuthenticatedEndpoint(): boolean {
    return true;
  }

  get endpoint(): string {
    return this.endPoint.adminUserOtps;
  }

  openModal(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  getUserOtps(branchId?: number | null, search?: string, status: string = 'active'): Observable<any> {
    const params: string[] = [];
    if (branchId !== undefined && branchId !== null) {
      params.push(`branch=${branchId}`);
    }
    if (search && search.trim()) {
      params.push(`search=${encodeURIComponent(search.trim())}`);
    }
    if (status) {
      params.push(`status=${status}`);
    }
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.httpClient.get(`${this.endpoint}${qs}`, { headers: this.headers });
  }
}
