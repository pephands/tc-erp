import { Injectable, Injector } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface AttendanceCheckInPayload {
  userId?: string | number;
  userName?: string;
  userRole?: string;
  latitude?: number;
  longitude?: number;
  ipAddress: string;
  timestamp: string;
  deviceid?: string;
  is_wfh?: boolean;
  override_code?: string;
}

export interface AttendanceCheckInResponse {
  status: 'MARKED' | 'REJECTED';
  message: string;
  matchedIp?: string;
  matchedLocation?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceCheckInService extends BaseHttpService {
  constructor(
    public endPoint: Endpoint,
    public injector: Injector
  ) {
    super(injector);
  }

  get isAuthenticatedEndpoint(): boolean {
    return true;
  }

  get endpoint(): string {
    return this.endPoint.attendanceCheckIn;
  }

  /**
   * Captures the client's current geographic location via HTML5 Geolocation API
   * Tries high accuracy first, falls back to standard accuracy if high accuracy times out/fails
   */
  getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        // First attempt with high accuracy (5 second timeout)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          () => {
            // Fallback to standard accuracy (10 second timeout)
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude
                });
              },
              (err) => reject(err),
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        reject(new Error('Geolocation is not supported by this browser.'));
      }
    });
  }

  /**
   * Retrieves the client's IP address using primary and fallback services
   */
  getClientIp(): Observable<string> {
    return this.httpClient.get<{ ip: string }>('https://api.ipify.org?format=json').pipe(
      map(res => res.ip),
      catchError(() => this.httpClient.get<{ ip: string }>('https://api.ip.sb/jsonip').pipe(
        map(res => res.ip),
        catchError(() => this.httpClient.get<any>('https://api.db-ip.com/v2/free/self').pipe(
          map(res => res.ipAddress),
          catchError(() => of('127.0.0.1'))
        ))
      ))
    );
  }

  /**
   * Device Authorization ID LocalStorage Management
   */
  private readonly DEVICE_STORAGE_KEY = 'device_id';

  getDeviceId(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.DEVICE_STORAGE_KEY);
    }
    return null;
  }

  setDeviceId(deviceId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.DEVICE_STORAGE_KEY, deviceId);
    }
  }

  clearDeviceId(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.DEVICE_STORAGE_KEY);
    }
  }

  hasDeviceId(): boolean {
    return !!this.getDeviceId();
  }

  hasCheckedInToday(): boolean {
    if (typeof localStorage !== 'undefined') {
      const lastCheckin = localStorage.getItem('tc_erp_last_checkin_date');
      return lastCheckin === new Date().toDateString();
    }
    return false;
  }

  setAttendanceMarked(attendanceId?: number, timeStr?: string, isWfh?: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tc_erp_last_checkin_date', new Date().toDateString());
      if (attendanceId) {
        localStorage.setItem('tc_erp_attendance_id', attendanceId.toString());
      }
      if (timeStr) {
        localStorage.setItem('tc_erp_checkin_time', timeStr);
      }
      if (isWfh) {
        localStorage.setItem('tc_erp_is_wfh', 'true');
      } else {
        localStorage.removeItem('tc_erp_is_wfh');
      }
    }
  }

  isWfhToday(): boolean {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('tc_erp_is_wfh') === 'true';
    }
    return false;
  }

  getCheckInTime(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('tc_erp_checkin_time');
    }
    return null;
  }

  getAttendanceId(): number | null {
    if (typeof localStorage !== 'undefined') {
      const idStr = localStorage.getItem('tc_erp_attendance_id');
      return idStr ? parseInt(idStr, 10) : null;
    }
    return null;
  }

  clearAttendanceMarked(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tc_erp_last_checkin_date');
      localStorage.removeItem('tc_erp_attendance_id');
      localStorage.removeItem('tc_erp_checkin_time');
      localStorage.removeItem('tc_erp_is_wfh');
      localStorage.setItem('tc_erp_has_checked_out_date', new Date().toDateString());
    }
  }

  hasCheckedOutToday(): boolean {
    if (typeof localStorage !== 'undefined') {
      const lastCheckout = localStorage.getItem('tc_erp_has_checked_out_date');
      return lastCheckout === new Date().toDateString();
    }
    return false;
  }

  /**
   * Submit Check-In payload to the backend
   */
  submitCheckIn(payload: AttendanceCheckInPayload): Observable<any> {
    return this.httpPostMethod(payload);
  }
}
