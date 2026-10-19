import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserOtpAdminService, UserOTPRecord } from '../../services/user-otp-admin.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-device-otp-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-device-otp-modal.component.html',
  styleUrl: './admin-device-otp-modal.component.css'
})
export class AdminDeviceOtpModalComponent implements OnInit, OnDestroy {
  public otpService = inject(UserOtpAdminService);
  private branchService = inject(BranchListService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  currentUser = this.authService.currentUser;
  userRoles = this.authService.userRoles;

  get primaryRole(): string {
    const roles = this.userRoles();
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    if (roles.includes('SUPERINTENDENT')) return 'SUPERINTENDENT';
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('TC')) return 'TC';
    return roles.length > 0 ? roles[0] : '';
  }

  isOpen = this.otpService.isModalOpen;
  otpList = signal<UserOTPRecord[]>([]);
  isLoading = signal<boolean>(false);
  branches = signal<any[]>([]);
  selectedBranch = signal<number | null>(null);
  searchText = signal<string>('');
  copiedCode = signal<string | null>(null);

  private countdownInterval: any = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        if (this.primaryRole === 'ADMIN') {
          this.loadBranches();
        }
        this.fetchOtps();
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopTimer();
  }

  onClose(): void {
    this.otpService.closeModal();
  }

  loadBranches(): void {
    if (this.primaryRole !== 'ADMIN') return;
    if (this.branches().length > 0) return;
    this.branchService.getData(1, 1000).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.branches.set(res.data);
        } else if (res && res.results) {
          this.branches.set(res.results);
        } else if (Array.isArray(res)) {
          this.branches.set(res);
        }
      },
      error: () => {}
    });
  }

  fetchOtps(): void {
    this.isLoading.set(true);
    this.otpService.getUserOtps(this.selectedBranch(), this.searchText()).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res && res.status === 'success' && res.data) {
          const activeOnly = res.data.filter((item: UserOTPRecord) => item.is_valid && item.expires_in_seconds > 0);
          this.otpList.set(activeOnly);
        } else if (Array.isArray(res)) {
          const activeOnly = res.filter((item: UserOTPRecord) => item.is_valid && item.expires_in_seconds > 0);
          this.otpList.set(activeOnly);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toastService.error('Error', err?.error?.message || 'Failed to fetch user OTPs.');
      }
    });
  }

  onBranchChange(branchId: any): void {
    const val = branchId ? Number(branchId) : null;
    this.selectedBranch.set(val);
    this.fetchOtps();
  }

  onSearchChange(term: string): void {
    this.searchText.set(term);
    this.fetchOtps();
  }

  clearSearch(): void {
    this.searchText.set('');
    this.fetchOtps();
  }

  copyOtp(code: string): void {
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copiedCode.set(code);
        this.toastService.info('Copied', `OTP ${code} copied to clipboard!`);
        setTimeout(() => {
          if (this.copiedCode() === code) {
            this.copiedCode.set(null);
          }
        }, 3000);
      });
    }
  }

  formatCountdown(seconds: number): string {
    if (!seconds || seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }

  private startTimer(): void {
    this.stopTimer();
    this.countdownInterval = setInterval(() => {
      this.otpList.update(list =>
        list
          .map(item => {
            const nextSec = item.expires_in_seconds - 1;
            return {
              ...item,
              expires_in_seconds: nextSec,
              is_valid: nextSec > 0
            };
          })
          .filter(item => item.is_valid && item.expires_in_seconds > 0)
      );
    }, 1000);
  }

  private stopTimer(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
