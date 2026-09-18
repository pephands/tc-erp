import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';
import { AttendanceRecord } from '../models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService extends BaseHttpService {
  readonly attendanceRecords = signal<AttendanceRecord[]>([]);

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
    return this.endPoint.attendanceList;
  }

  getAttendanceRecords(branch?: string, startDate?: string, endDate?: string, search?: string, page: number = 1, pageSize: number = 10): Observable<any> {
    let url = `${this.endpoint}?page=${page}&page_size=${pageSize}&`;
    if (branch) url += `branch=${encodeURIComponent(branch)}&`;
    if (startDate) url += `start_date=${encodeURIComponent(startDate)}&`;
    if (endDate) url += `end_date=${encodeURIComponent(endDate)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    return this.httpClient.get(url, { headers: this.headers });
  }

  exportAttendanceExcel(branch?: string, startDate?: string, endDate?: string, search?: string): Observable<Blob> {
    let url = `${this.endPoint.attendanceExport}?`;
    if (branch) url += `branch=${encodeURIComponent(branch)}&`;
    if (startDate) url += `start_date=${encodeURIComponent(startDate)}&`;
    if (endDate) url += `end_date=${encodeURIComponent(endDate)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    return this.httpClient.get(url, { headers: this.headers, responseType: 'blob' });
  }
}
