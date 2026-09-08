import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Endpoint {
  baseUrl: string = 'http://127.0.0.1:8000/';

  // user authentication

  get login(): string {
    return this.baseUrl + 'accounts/login/';
  }

  get logout(): string {
    return this.baseUrl + 'accounts/logout/';
  }

  get users(): string {
    return this.baseUrl + 'accounts/users/';
  }

  // Branches
  get branches(): string {
    return this.baseUrl + 'branches/';
  }

  // Attendance Check-In / Check-Out
  get attendanceCheckIn(): string {
    return this.baseUrl + 'attendance/check-in/';
  }

  get attendanceCheckOut(): string {
    return this.baseUrl + 'attendance/check-out/';
  }

  get attendanceToday(): string {
    return this.baseUrl + 'attendance/today/';
  }

  get wfhPasscode(): string {
    return this.baseUrl + 'attendance/wfh-passcode/';
  }

  get wfhRequest(): string {
    return this.baseUrl + 'attendance/wfh-request/';
  }
}
