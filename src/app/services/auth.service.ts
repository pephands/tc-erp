import { Injectable, signal, computed } from '@angular/core';
import { User, AuthSession, MOCK_USERS } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'tc_erp_auth_session';

  // Signals for reactive state
  readonly currentSession = signal<AuthSession | null>(this.loadStoredSession());
  readonly currentUser = computed(() => this.currentSession()?.user ?? null);
  readonly isLoggedIn = computed(() => !!this.currentSession());
  readonly userRole = computed(() => this.currentSession()?.user.role ?? null);

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

  login(username: string, password: string): { success: boolean; message: string; user?: User } {
    const cleanUsername = username.trim().toLowerCase();
    const mockAccount = MOCK_USERS[cleanUsername];

    if (!mockAccount) {
      return { success: false, message: 'Invalid username. Please check your credentials.' };
    }

    if (mockAccount.password !== password) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    const session: AuthSession = {
      user: mockAccount.user,
      token: `mock_jwt_${Date.now()}_${mockAccount.user.id}`,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    this.currentSession.set(session);

    return { success: true, message: 'Login successful!', user: mockAccount.user };
  }

  quickLogin(usernameKey: string): { success: boolean; message: string; user?: User } {
    const mockAccount = MOCK_USERS[usernameKey];
    if (!mockAccount) {
      return { success: false, message: 'Account not found.' };
    }
    return this.login(mockAccount.user.username, mockAccount.password);
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('tc_erp_device_id');
    this.currentSession.set(null);
  }

  hasRole(allowedRoles: Array<'ADMIN' | 'TL' | 'TC'>): boolean {
    const role = this.userRole();
    return role ? allowedRoles.includes(role) : false;
  }
}
