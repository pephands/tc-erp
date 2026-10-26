import { Injectable, signal } from '@angular/core';

export interface SecurityNoticeConfig {
  title: string;
  message: string;
  attemptedRoute?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityNoticeModalService {
  private readonly STORAGE_KEY = 'tc_erp_security_modal_notice';

  isOpen = signal<boolean>(false);
  config = signal<SecurityNoticeConfig>({
    title: 'Security Notice',
    message: 'You do not have permission to access this page. You have been logged out.'
  });

  constructor() {
    this.checkPersistedNotice();
  }

  show(notice?: Partial<SecurityNoticeConfig>): void {
    const newConfig: SecurityNoticeConfig = {
      title: notice?.title || 'Security Notice',
      message: notice?.message || 'You do not have permission to access this page. You have been logged out.',
      attemptedRoute: notice?.attemptedRoute,
      role: notice?.role
    };

    this.config.set(newConfig);
    this.isOpen.set(true);

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(newConfig));
      } catch {
        // Safe fallback if sessionStorage is restricted
      }
    }
  }

  close(): void {
    this.isOpen.set(false);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(this.STORAGE_KEY);
      } catch {
        // Safe fallback
      }
    }
  }

  private checkPersistedNotice(): void {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as SecurityNoticeConfig;
          this.config.set(parsed);
          this.isOpen.set(true);
        }
      } catch {
        // Ignore parse error
      }
    }
  }
}
