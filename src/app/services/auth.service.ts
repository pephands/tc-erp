import { Injectable, signal, computed, inject } from '@angular/core';
import { User, AuthSession } from '../models/user.model';
import { AdminLoginService } from './login.service';
import { LogoutService } from './logout.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'tc_erp_auth_session';
  private loginService = inject(AdminLoginService);
  private logoutService = inject(LogoutService);

  // Signals for reactive state
  readonly currentSession = signal<AuthSession | null>(this.loadStoredSession());
  readonly currentUser = computed(() => this.currentSession()?.user ?? null);
  readonly isLoggedIn = computed(() => !!this.currentSession());
  readonly userRoles = computed(() => this.currentSession()?.user.roles?.map(r => r.name.toUpperCase()) ?? []);

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

  login(username: string, password: string): Observable<{ success: boolean; message: string; user?: User }> {
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

          return { success: true, message: 'Login successful!', user: response.user };
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
    // Deliberately NOT clearing 'device_id' here so the physical device remains uniquely identified across logouts.
    localStorage.removeItem('tc_erp_last_checkin_date');
    this.currentSession.set(null);
  }

  hasRole(allowedRoles: Array<string>): boolean {
    const roles = this.userRoles();
    return allowedRoles.some(allowed => roles.includes(allowed));
  }
}
