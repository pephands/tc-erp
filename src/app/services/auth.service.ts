import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User, AuthSession } from '../models/user.model';
import { AdminLoginService } from './login.service';
import { LogoutService } from './logout.service';
import { Endpoint } from '../http/endpoint';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'tc_erp_auth_session';
  private loginService = inject(AdminLoginService);
  private logoutService = inject(LogoutService);
  private endpoint = inject(Endpoint);
  private http = inject(HttpClient);

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

  login(username: string, password: string): Observable<{ success: boolean; message: string; user?: User; mustResetPassword?: boolean }> {
    return this.loginService.getData({ username, password }).pipe(
      map((response: any) => {
        if (response.status === 'success' || response.token) {
          const session: AuthSession = {
            user: response.user,
            token: response.token,
            loginTime: new Date().toISOString()
          };

          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
          this.currentSession.set(session);

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

  private clearLocalSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('tc_erp_last_checkin_date');
    this.closePasswordResetModal(true);
    this.currentSession.set(null);
  }

  hasRole(allowedRoles: Array<string>): boolean {
    const roles = this.userRoles();
    return allowedRoles.some(allowed => roles.includes(allowed));
  }

  extractRoleCodes(rolesList: any[]): string[] {
    const codes: string[] = [];
    if (!rolesList || !Array.isArray(rolesList)) return codes;

    for (const r of rolesList) {
      if (typeof r === 'string') {
        const upper = r.trim().toUpperCase();
        codes.push(upper);
        if (upper === 'TEAM LEAD' || upper === 'MANAGER' || upper === 'TL') codes.push('TL');
        if (upper === 'TELE CALLER' || upper === 'TELECALLER' || upper === 'TC') codes.push('TC');
        if (upper === 'ADMINISTRATOR' || upper === 'ADMIN') codes.push('ADMIN');
      } else if (r && typeof r === 'object') {
        const code = (r.code || '').trim().toUpperCase();
        const name = (r.name || '').trim().toUpperCase();
        if (code) codes.push(code);
        if (name) codes.push(name);
        if (name === 'TEAM LEAD' || name === 'MANAGER' || code === 'TL') codes.push('TL');
        if (name === 'TELE CALLER' || name === 'TELECALLER' || code === 'TC') codes.push('TC');
        if (name === 'ADMINISTRATOR' || code === 'ADMIN') codes.push('ADMIN');
      }
    }
    return Array.from(new Set(codes));
  }
}
