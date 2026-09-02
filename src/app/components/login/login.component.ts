import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  // Quick preset accounts info
  readonly quickAccounts = [
    { key: 'admin', label: 'Admin', role: 'ADMIN', badgeClass: 'badge-admin', desc: 'Full Access & Analytics' },
    { key: 'tl_rajesh', label: 'TL (Team Lead)', role: 'TL', badgeClass: 'badge-tl', desc: 'Team & Campaign Mgmt' },
    { key: 'tc_priya', label: 'TC (Telecaller)', role: 'TC', badgeClass: 'badge-tc', desc: 'Calling Queue & Leads' }
  ];

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  onLogin(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage.set('Please enter both username and password.');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    setTimeout(() => {
      const result = this.authService.login(this.username, this.password);
      this.isLoading.set(false);

      if (result.success) {
        this.navigateAfterLogin();
      } else {
        this.errorMessage.set(result.message);
      }
    }, 400);
  }

  onQuickLogin(accountKey: string): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    setTimeout(() => {
      const result = this.authService.quickLogin(accountKey);
      this.isLoading.set(false);

      if (result.success) {
        this.navigateAfterLogin();
      } else {
        this.errorMessage.set(result.message);
      }
    }, 300);
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
