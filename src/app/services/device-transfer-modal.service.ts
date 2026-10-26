import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DeviceTransferModalService {
  private authService = inject(AuthService);
  private router = inject(Router);

  isOpen = signal<boolean>(false);
  code = signal<string | null>(null);
  expiresInSeconds = signal<number>(0);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  private timerInterval: any = null;
  private channel: BroadcastChannel | null = null;

  formattedCode = computed(() => {
    const raw = this.code();
    if (!raw) return '------';
    if (raw.length === 6) {
      return `${raw.slice(0, 3)}\u00A0${raw.slice(3)}`;
    }
    return raw;
  });

  countdownDisplay = computed(() => {
    const total = this.expiresInSeconds();
    if (total <= 0) return '00:00';
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  constructor() {
    // Automatically close modal if session terminates
    effect(() => {
      if (!this.authService.isLoggedIn()) {
        this.close();
      }
    });

    this.initEventListeners();
  }

  /**
   * Broadcast from new device when it attempts login and triggers transfer code requirement
   */
  broadcastTransferRequested(employee_Id: string): void {
    const payload = { type: 'TRANSFER_REQUESTED', employee_Id, timestamp: Date.now() };
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (_) {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('tc_erp_device_transfer_event', JSON.stringify(payload));
      } catch (_) {}
    }
  }

  /**
   * Broadcast from new device when transfer is verified and authorized
   */
  broadcastTransferCompleted(employee_Id: string): void {
    const payload = { type: 'TRANSFER_COMPLETED', employee_Id, timestamp: Date.now() };
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (_) {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('tc_erp_device_transfer_event', JSON.stringify(payload));
      } catch (_) {}
    }
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;

    // 1. Inter-window / Inter-tab BroadcastChannel
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('tc_erp_device_transfer');
        this.channel.onmessage = (event) => this.handleTransferEvent(event.data);
      } catch (_) {}
    }

    // 2. Storage event listener (syncs across all tabs/windows of the origin)
    window.addEventListener('storage', (event) => {
      if (event.key === 'tc_erp_device_transfer_event' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          this.handleTransferEvent(data);
        } catch (_) {}
      }
    });
  }

  private handleTransferEvent(data: any): void {
    if (!data || !this.authService.isLoggedIn()) return;

    const currentUser = this.authService.currentUser();
    const currentEmpId = currentUser?.employee_Id?.toString().toLowerCase().trim();
    const eventEmpId = data.employee_Id?.toString().toLowerCase().trim();

    // Verify the transfer request belongs to this logged-in account
    if (eventEmpId && currentEmpId && eventEmpId !== currentEmpId) {
      return;
    }

    if (data.type === 'TRANSFER_COMPLETED') {
      this.close();
      this.authService.forceSessionLogout('session_transferred');
      this.router.navigate(['/login'], {
        queryParams: { sessionTransferred: 'true' },
        replaceUrl: true
      });
    }
  }

  show(code?: string | null, expiresInSeconds?: number): void {
    if (code) {
      this.code.set(code);
      this.startCountdown(expiresInSeconds || 300);
      this.isOpen.set(true);
    } else {
      // Triggered only when user clicks Device Code button
      this.fetchOrGenerateCode();
    }
  }

  fetchOrGenerateCode(): void {
    this.isOpen.set(true);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.authService.getActiveDeviceCode().subscribe({
      next: (res) => {
        if (res.has_pending_code && res.code && res.expires_in_seconds > 0) {
          this.isLoading.set(false);
          this.code.set(res.code);
          this.startCountdown(res.expires_in_seconds);
          this.isOpen.set(true);
        } else {
          this.refreshCode();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.close();
          this.authService.forceSessionLogout('session_transferred');
          this.router.navigate(['/login'], {
            queryParams: { sessionTransferred: 'true' },
            replaceUrl: true
          });
        } else {
          this.refreshCode();
        }
      }
    });
  }

  close(): void {
    this.isOpen.set(false);
  }

  refreshCode(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.authService.generateActiveDeviceCode().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.code) {
          this.code.set(res.code);
          this.startCountdown(res.expires_in_seconds || 300);
          this.isOpen.set(true);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.close();
          this.authService.forceSessionLogout('session_transferred');
          this.router.navigate(['/login'], {
            queryParams: { sessionTransferred: 'true' },
            replaceUrl: true
          });
        } else {
          this.errorMessage.set('Failed to generate verification code. Please try again.');
        }
      }
    });
  }

  private startCountdown(seconds: number): void {
    this.stopCountdown();
    this.expiresInSeconds.set(seconds);
    this.timerInterval = setInterval(() => {
      this.expiresInSeconds.update(v => {
        if (v <= 1) {
          this.stopCountdown();
          this.code.set(null);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
