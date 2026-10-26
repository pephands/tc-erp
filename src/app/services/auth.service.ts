import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User, AuthSession } from '../models/user.model';
import { AdminLoginService } from './login.service';
import { LogoutService } from './logout.service';
import { Endpoint } from '../http/endpoint';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AttendanceCheckInService } from './attendance-checkin.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'tc_erp_auth_session';
  private loginService = inject(AdminLoginService);
  private logoutService = inject(LogoutService);
  private endpoint = inject(Endpoint);
  private http = inject(HttpClient);
  private attendanceCheckInService = inject(AttendanceCheckInService);

  // Signals for reactive state
  readonly currentSession = signal<AuthSession | null>(this.loadStoredSession());
  readonly currentUser = computed(() => this.currentSession()?.user ?? null);
  readonly isLoggedIn = computed(() => !!this.currentSession());
  readonly userRoles = computed(() => {
    const rolesList = this.currentSession()?.user.roles ?? [];
    return this.extractRoleCodes(rolesList);
  });

  // Password Reset Modal Signals
  readonly isPasswordResetModalOpen = signal<boolean>(false);
  readonly isPasswordResetMandatory = signal<boolean>(false);

  constructor() {
    const session = this.currentSession();
    if (session && session.user && session.user.is_password_reset_required) {
      this.openPasswordResetModal(true);
    }
  }

  openPasswordResetModal(mandatory = false): void {
    this.isPasswordResetMandatory.set(mandatory);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal(force = false): void {
    if (force || !this.isPasswordResetMandatory()) {
      this.isPasswordResetModalOpen.set(false);
    }
  }

  private loadStoredSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AuthSession;
      }
    } catch (e) {
      console.error('Failed to parse session from localStorage', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return null;
  }

  login(employee_Id: string, password: string, forceNewCode: boolean = false): Observable<{
    success: boolean;
    message: string;
    user?: User;
    mustResetPassword?: boolean;
    requiresTransferCode?: boolean;
    expiresInSeconds?: number;
    employee_Id?: string;
  }> {
    return this.loginService.getData({ employee_Id, password, force_new_code: forceNewCode }).pipe(
      map((response: any) => {
        if (response.status === 'transfer_required' || response.requires_code) {
          return {
            success: false,
            requiresTransferCode: true,
            message: response.message || 'Verification code required to transfer device session.',
            expiresInSeconds: response.expires_in_seconds || 300,
            employee_Id: response.employee_Id || employee_Id
          };
        }

        if (response.status === 'success' || response.token) {
          const session: AuthSession = {
            user: response.user,
            token: response.token,
            loginTime: new Date().toISOString()
          };

          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
          this.currentSession.set(session);

          // Inherit attendance check-in status if already marked today
          if (response.attendance && response.attendance.has_checked_in) {
            this.attendanceCheckInService.setAttendanceMarked(
              response.attendance.attendance_id,
              response.attendance.checkin_time,
              response.attendance.is_wfh
            );
          }

          const mustReset = !!(response.must_reset_password || response.user?.is_password_reset_required);
          if (mustReset) {
            this.openPasswordResetModal(true);
          }

          return { success: true, message: 'Login successful!', user: response.user, mustResetPassword: mustReset };
        } else {
          return { success: false, message: response.message || 'Login failed.' };
        }
      }),
      catchError((error) => {
        let errorMsg = 'An error occurred during login. Please try again.';
        if (error.error && error.error.errors) {
          if (error.error.errors.non_field_errors) {
            errorMsg = error.error.errors.non_field_errors[0];
          } else {
            errorMsg = 'Invalid credentials.';
          }
        } else if (error.error && error.error.message) {
          errorMsg = error.error.message;
        }
        return of({ success: false, message: errorMsg });
      })
    );
  }

  verifyDeviceTransfer(employee_Id: string, password: string, code: string): Observable<{
    success: boolean;
    message: string;
    user?: User;
    mustResetPassword?: boolean;
  }> {
    const currentDeviceId = this.attendanceCheckInService.getDeviceId();
    return this.http.post<any>(this.endpoint.verifyDeviceTransfer, {
      employee_Id,
      password,
      code,
      device_id: currentDeviceId
    }).pipe(
      map((response: any) => {
        if (response.status === 'success' && response.token) {
          const session: AuthSession = {
            user: response.user,
            token: response.token,
            loginTime: new Date().toISOString()
          };

          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
          this.currentSession.set(session);

          // Inherit attendance check-in status if already marked today
          if (response.attendance && response.attendance.has_checked_in) {
            this.attendanceCheckInService.setAttendanceMarked(
              response.attendance.attendance_id,
              response.attendance.checkin_time,
              response.attendance.is_wfh
            );
            if (response.attendance.device_id) {
              this.attendanceCheckInService.setDeviceId(response.attendance.device_id);
            }
          }

          const mustReset = !!(response.must_reset_password || response.user?.is_password_reset_required);
          if (mustReset) {
            this.openPasswordResetModal(true);
          }

          return { success: true, message: 'Device transfer successful!', user: response.user, mustResetPassword: mustReset };
        } else {
          return { success: false, message: response.message || 'Verification failed.' };
        }
      }),
      catchError((error) => {
        let errorMsg = 'Failed to verify transfer code. Please try again.';
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        }
        return of({ success: false, message: errorMsg });
      })
    );
  }

  getActiveDeviceCode(): Observable<{ has_pending_code: boolean; code: string | null; expires_in_seconds: number }> {
    const session = this.currentSession();
    const headers = session?.token ? new HttpHeaders({ Authorization: `Token ${session.token}` }) : new HttpHeaders();
    return this.http.get<any>(this.endpoint.activeDeviceCode, { headers });
  }

  generateActiveDeviceCode(): Observable<{ has_pending_code: boolean; code: string; expires_in_seconds: number; message: string }> {
    const session = this.currentSession();
    const headers = session?.token ? new HttpHeaders({ Authorization: `Token ${session.token}` }) : new HttpHeaders();
    return this.http.post<any>(this.endpoint.activeDeviceCode, {}, { headers });
  }

  changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Observable<any> {
    const session = this.currentSession();
    const headers: any = session?.token ? { Authorization: `Token ${session.token}` } : {};
    return this.http.post(this.endpoint.changePassword, {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    }, { headers });
  }

  markPasswordResetCompleted(updatedUser?: User): void {
    this.closePasswordResetModal(true);
    const session = this.currentSession();
    if (session) {
      if (updatedUser) {
        session.user = updatedUser;
      }
      session.user.is_password_reset_required = false;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      this.currentSession.set({ ...session });
    }
  }

  logout(): Observable<boolean> {
    const today = new Date().toLocaleDateString('en-CA');
    const lastCheckin = localStorage.getItem('tc_erp_last_checkin_date');
    const hasCheckedOut = localStorage.getItem('tc_erp_has_checked_out_date');

    const isCheckedIn = (lastCheckin === today && hasCheckedOut !== today);
    const isAdmin = this.hasRole(['ADMIN']);

    if (isCheckedIn && !isAdmin) {
      alert("Please mark your Check-out before logging out.");
      return throwError(() => new Error('Checkout required before logout.'));
    }

    return this.logoutService.getData({}).pipe(
      map(() => {
        this.clearLocalSession();
        return true;
      }),
      catchError(() => {
        this.clearLocalSession();
        return of(false);
      })
    );
  }

  forceSessionLogout(reason: 'session_transferred' | 'session_expired' = 'session_transferred'): void {
    this.clearLocalSession();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tc_erp_attendance_id');
      localStorage.removeItem('tc_erp_checkin_time');
      localStorage.removeItem('tc_erp_is_wfh');
    }
  }

  private clearLocalSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('tc_erp_last_checkin_date');
      localStorage.removeItem('tc_erp_has_checked_out_date');
    }
    this.closePasswordResetModal(true);
    this.currentSession.set(null);
  }

  fetchLatestSession(): Observable<boolean> {
    const session = this.currentSession();
    if (!session || !session.token) {
      return of(false);
    }
    
    return this.http.get<{status: string, user: User}>(this.endpoint.me, {
      headers: { Authorization: `Token ${session.token}` }
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.user) {
          const updatedSession = { ...session, user: response.user };
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSession));
          this.currentSession.set(updatedSession);
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  getPrimaryRole(): string {
    const roles = this.userRoles();
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    if (roles.includes('SUPERINTENDENT')) return 'SUPERINTENDENT';
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('OT') || roles.includes('ONLINE PAYMENT TEAM')) return 'OT';
    if (roles.includes('TCT')) return 'TCT';
    if (roles.includes('PUBLIC_RELATIONS') || roles.includes('PUBLIC RELATIONSHIP OFFICER') || roles.includes('PR')) return 'PUBLIC_RELATIONS';
    if (roles.includes('TC')) return 'TC';
    return roles.length > 0 ? roles[0] : '';
  }

  hasRoleAccess(allowedRoles?: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    const userRoles = this.userRoles();
    const primary = this.getPrimaryRole();
    if (primary === 'MANAGER') {
      return allowedRoles.includes('MANAGER');
    }
    if (primary && allowedRoles.includes(primary)) {
      return true;
    }
    return allowedRoles.some((r) => userRoles.includes(r));
  }

  hasRole(allowedRoles: Array<string>): boolean {
    return this.hasRoleAccess(allowedRoles);
  }


  extractRoleCodes(rolesList: any[]): string[] {
    const codes: string[] = [];
    if (!rolesList || !Array.isArray(rolesList)) return codes;

    for (const r of rolesList) {
      if (typeof r === 'string') {
        const upper = r.trim().toUpperCase();
        codes.push(upper);
        if (upper === 'TEAM LEAD' || upper === 'TL') codes.push('TL');
        if (upper === 'MANAGER') codes.push('MANAGER');
        if (upper === 'TELE CALLER' || upper === 'TELECALLER' || upper === 'TC') codes.push('TC');
        if (upper === 'ADMINISTRATOR' || upper === 'ADMIN') codes.push('ADMIN');
        if (upper === 'THANKS CALLING TEAM' || upper === 'TCT') {
          codes.push('TCT');
          codes.push('THANKS CALLING TEAM');
        }
        if (upper === 'ONLINE PAYMENT TEAM' || upper === 'OT') {
          codes.push('OT');
          codes.push('ONLINE PAYMENT TEAM');
        }
        if (upper === 'PUBLIC RELATIONSHIP OFFICER' || upper === 'PUBLIC RELATIONS' || upper === 'PUBLIC_RELATIONS' || upper === 'PR') {
          codes.push('PUBLIC_RELATIONS');
          codes.push('PUBLIC RELATIONSHIP OFFICER');
          codes.push('PUBLIC RELATIONS');
        }
      } else if (r && typeof r === 'object') {
        const code = (r.code || '').trim().toUpperCase();
        const name = (r.name || '').trim().toUpperCase();
        if (code) codes.push(code);
        if (name) codes.push(name);
        if (name === 'TEAM LEAD' || code === 'TL') codes.push('TL');
        if (name === 'MANAGER' || code === 'MANAGER') codes.push('MANAGER');
        if (name === 'TELE CALLER' || name === 'TELECALLER' || code === 'TC') codes.push('TC');
        if (name === 'ADMINISTRATOR' || code === 'ADMIN') codes.push('ADMIN');
        if (name === 'THANKS CALLING TEAM' || code === 'TCT') {
          codes.push('TCT');
          codes.push('THANKS CALLING TEAM');
        }
        if (name === 'ONLINE PAYMENT TEAM' || code === 'OT') {
          codes.push('OT');
          codes.push('ONLINE PAYMENT TEAM');
        }
        if (name === 'PUBLIC RELATIONSHIP OFFICER' || name === 'PUBLIC RELATIONS' || code === 'PUBLIC_RELATIONS' || code === 'PR') {
          codes.push('PUBLIC_RELATIONS');
          codes.push('PUBLIC RELATIONSHIP OFFICER');
          codes.push('PUBLIC RELATIONS');
        }
      }
    }
    return Array.from(new Set(codes));
  }
}
