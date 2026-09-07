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
  userId?: string;
  userName?: string;
  userRole?: string;
  latitude: number;
  longitude: number;
  ipAddress: string;
  timestamp: string;
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
   */
  getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        reject(new Error('Geolocation is not supported by this browser.'));
      }
    });
  }

  /**
   * Retrieves the client's IP address from ipify or fallback service
   */
  getClientIp(): Observable<string> {
    return this.httpClient.get<{ ip: string }>('https://api.ipify.org?format=json').pipe(
      map(res => res.ip),
      catchError(() => of('127.0.0.1'))
    );
  }

  /**
   * Device Authorization ID LocalStorage Management
   */
  private readonly DEVICE_STORAGE_KEY = 'tc_erp_device_id';

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

  /**
   * Submit Check-In payload to the backend
   */
  submitCheckIn(payload: AttendanceCheckInPayload): Observable<any> {
    return this.httpPostMethod(payload);
  }
}
