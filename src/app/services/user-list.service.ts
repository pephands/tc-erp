import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root',
})
export class UserListService extends BaseHttpService {
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
    return this.endPoint.users;
  }

  getUsers(branchId?: number | null, roleCode?: string | null, page?: number, limit?: number, search?: string): Observable<any> {
    let url = this.endpoint + '?';
    if (branchId) url += `branch=${branchId}&`;
    if (roleCode) url += `role=${roleCode}&`;
    if (page) url += `page=${page}&`;
    if (limit) url += `page_size=${limit}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;

    return this.httpClient.get(url, { headers: this.headers });
  }

  getRoleUsers(
    roleCode: string,
    branch?: string | number | null,
    loginTime?: string | null,
    logOffTime?: string | null,
    page?: number,
    limit?: number,
    search?: string,
    isActive?: string
  ): Observable<any> {
    let url = `${this.endpoint}?role=${encodeURIComponent(roleCode)}&`;
    if (isActive) {
      if (isActive.toLowerCase() === 'active') url += 'is_active=true&';
      else if (isActive.toLowerCase() === 'inactive') url += 'is_active=false&';
      else url += 'is_active=all&';
    } else {
      url += 'is_active=all&';
    }
    if (branch) url += `branch=${encodeURIComponent(branch)}&`;
    if (loginTime) url += `login_time=${encodeURIComponent(loginTime)}&`;
    if (logOffTime) url += `logoff_time=${encodeURIComponent(logOffTime)}&`;
    if (page) url += `page=${page}&`;
    if (limit) url += `page_size=${limit}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    return this.httpClient.get(url, { headers: this.headers });
  }

  getTelecallers(branch?: string | number | null, loginTime?: string | null, logOffTime?: string | null, page?: number, limit?: number, search?: string): Observable<any> {
    return this.getRoleUsers('TC', branch, loginTime, logOffTime, page, limit, search);
  }

  toggleUserStatus(userId: string | number, newStatus: string): Observable<any> {
    const url = `${this.endpoint}${userId}/`;
    return this.httpClient.patch(url, { status: newStatus }, { headers: this.headers });
  }

  addUser(userData: any): Observable<any> {
    const headers = userData instanceof FormData ? this.multipartHeaders : this.headers;
    return this.httpClient.post(this.endpoint, userData, { headers: headers });
  }

  updateUser(userId: string | number, userData: any): Observable<any> {
    const url = `${this.endpoint}${userId}/`;
    const headers = userData instanceof FormData ? this.multipartHeaders : this.headers;
    return this.httpClient.patch(url, userData, { headers: headers });
  }

  deleteUser(userId: string | number): Observable<any> {
    const url = `${this.endpoint}${userId}/`;
    return this.httpClient.delete(url, { headers: this.headers });
  }

  uploadRoleUsersExcel(file: File, roleCode: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', roleCode);
    this.params = formData;
    return this.httpClient.post(`${this.endpoint}bulk-upload/`, formData, { headers: this.multipartHeaders });
  }

  uploadManagersExcel(file: File): Observable<any> {
    return this.uploadRoleUsersExcel(file, 'TL');
  }

  uploadTelecallersExcel(file: File): Observable<any> {
    return this.uploadRoleUsersExcel(file, 'TC');
  }

  downloadSampleTemplate(role: string = 'telecaller'): Observable<Blob> {
    const url = `${this.endpoint}sample-template/?role=${role}`;
    return this.httpClient.get(url, { headers: this.headers, responseType: 'blob' });
  }

  exportRoleUsersExcel(roleCode: string, branch?: string, search?: string): Observable<Blob> {
    let url = `${this.endpoint}export/?role=${encodeURIComponent(roleCode)}&`;
    if (branch) url += `branch=${encodeURIComponent(branch)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    return this.httpClient.get(url, { headers: this.headers, responseType: 'blob' });
  }

  exportTelecallersExcel(branch?: string, search?: string): Observable<Blob> {
    return this.exportRoleUsersExcel('TC', branch, search);
  }
}
