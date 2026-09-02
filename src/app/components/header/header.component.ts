import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);

  @Input() pageTitle = 'Dashboard';
  @Input() pageIcon = 'dashboard';
  @Input() parentTitle?: string;

  @Output() toggleMobileMenu = new EventEmitter<void>();

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;
  availableThemes = this.themeService.availableThemes;
  currentTheme = this.themeService.currentTheme;

  isUserDropdownOpen = signal<boolean>(false);
  isThemePickerOpen = signal<boolean>(false);

  toggleThemePicker(event?: Event): void {
    if (event) event.stopPropagation();
    this.isUserDropdownOpen.set(false);
    this.isThemePickerOpen.update(v => !v);
  }

  closeThemePicker(): void {
    this.isThemePickerOpen.set(false);
  }

  selectTheme(themeId: string): void {
    this.themeService.setTheme(themeId);
    this.closeThemePicker();
  }

  toggleUserDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isThemePickerOpen.set(false);
    this.isUserDropdownOpen.update(v => !v);
  }

  closeDropdowns(): void {
    this.isUserDropdownOpen.set(false);
    this.isThemePickerOpen.set(false);
  }

  onResetPassword(): void {
    this.closeDropdowns();
    alert('Reset Password requested. A password reset link has been sent to your email.');
  }

  onLogout(): void {
    this.closeDropdowns();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get roleBadgeClass(): string {
    const role = this.userRole();
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'TL': return 'badge-tl';
      case 'TC': return 'badge-tc';
      default: return '';
    }
  }
}
