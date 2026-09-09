import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-force-password-reset-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './force-password-reset-modal.component.html',
  styleUrl: './force-password-reset-modal.component.css'
})
export class ForcePasswordResetModalComponent {
  authService = inject(AuthService);
  private toastService = inject(ToastService);

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  showPasswords = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  get isOpen(): boolean {
    return this.authService.isPasswordResetModalOpen();
  }

  get isMandatory(): boolean {
    return this.authService.isPasswordResetMandatory();
  }

  toggleShowPasswords(): void {
    this.showPasswords.update(v => !v);
  }

  onCloseModal(): void {
    if (!this.isMandatory) {
      this.authService.closePasswordResetModal(false);
      this.resetForm();
    }
  }

  resetForm(): void {
    this.oldPassword = this.isMandatory ? 'Welcome@123' : '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    const currentOldPass = this.isMandatory && !this.oldPassword.trim() ? 'Welcome@123' : this.oldPassword.trim();

    if (!currentOldPass) {
      this.errorMessage.set('Please enter your current password.');
      return;
    }

    if (!this.newPassword.trim() || !this.confirmPassword.trim()) {
      this.errorMessage.set('Please enter and confirm your new password.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('New password and confirm password do not match.');
      return;
    }

    if (this.newPassword === 'Welcome@123' || (currentOldPass && this.newPassword === currentOldPass)) {
      this.errorMessage.set('New password cannot be the same as the initial or current password.');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage.set('New password must be at least 6 characters long.');
      return;
    }

    this.isSubmitting.set(true);

    this.authService.changePassword(currentOldPass, this.newPassword, this.confirmPassword).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        if (res.status === 'success') {
          this.toastService.success('Password Updated', 'Your password has been changed successfully.');
          this.authService.markPasswordResetCompleted(res.user);
          this.resetForm();
        } else {
          this.errorMessage.set(res.message || 'Failed to change password.');
        }
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        let msg = 'Failed to change password. Please check your inputs.';
        if (err?.error?.message) {
          msg = err.error.message;
        }
        this.errorMessage.set(msg);
      }
    });
  }
}
