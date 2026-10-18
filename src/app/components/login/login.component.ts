import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { DeviceTransferModalService } from '../../services/device-transfer-modal.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private deviceTransferModalService = inject(DeviceTransferModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  employee_Id = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  // Device Transfer State
  isTransferRequired = signal(false);
  transferCode = signal('');
  transferMessage = signal('');
  countdownSeconds = signal(300);
  private countdownTimer: any = null;

  countdownDisplay = computed(() => {
    const total = this.countdownSeconds();
    if (total <= 0) return '00:00';
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['sessionTransferred'] === 'true') {
        this.errorMessage.set('Your session was transferred to another device. You have been logged out of this device.');
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  onLogin(): void {
    if (!this.employee_Id.trim() || !this.password.trim()) {
      this.errorMessage.set('Please enter both employee_Id and password.');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.login(this.employee_Id, this.password).subscribe(result => {
      this.isLoading.set(false);
      if (result.success) {
        this.navigateAfterLogin();
      } else if (result.requiresTransferCode) {
        this.isTransferRequired.set(true);
        this.transferMessage.set(result.message || 'Verification code required to transfer device session.');
        this.startCountdown(result.expiresInSeconds || 300);
        this.deviceTransferModalService.broadcastTransferRequested(this.employee_Id);
      } else {
        this.errorMessage.set(result.message);
      }
    });
  }

  onVerifyTransfer(): void {
    const code = this.transferCode().trim();
    if (!code) {
      this.errorMessage.set('Please enter the 6-digit verification code.');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.verifyDeviceTransfer(this.employee_Id, this.password, code).subscribe(result => {
      this.isLoading.set(false);
      if (result.success) {
        this.stopCountdown();
        this.deviceTransferModalService.broadcastTransferCompleted(this.employee_Id);
        this.navigateAfterLogin();
      } else {
        this.errorMessage.set(result.message);
      }
    });
  }

  onResendCode(): void {
    if (!this.employee_Id.trim() || !this.password.trim()) {
      return;
    }
    this.errorMessage.set(null);
    this.isLoading.set(true);
    this.authService.login(this.employee_Id, this.password, true).subscribe(result => {
      this.isLoading.set(false);
      if (result.requiresTransferCode) {
        this.isTransferRequired.set(true);
        this.transferMessage.set(result.message || 'Verification code required to transfer device session.');
        this.startCountdown(result.expiresInSeconds || 300);
        this.deviceTransferModalService.broadcastTransferRequested(this.employee_Id);
      } else if (result.success) {
        this.navigateAfterLogin();
      } else {
        this.errorMessage.set(result.message);
      }
    });
  }

  onCancelTransfer(): void {
    this.stopCountdown();
    this.isTransferRequired.set(false);
    this.transferCode.set('');
    this.errorMessage.set(null);
  }

  private startCountdown(seconds: number): void {
    this.stopCountdown();
    this.countdownSeconds.set(seconds);
    this.countdownTimer = setInterval(() => {
      this.countdownSeconds.update(v => {
        if (v <= 1) {
          this.stopCountdown();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
