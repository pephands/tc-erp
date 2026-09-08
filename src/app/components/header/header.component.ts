import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { User } from '../../models/user.model';
import { AttendanceCheckInService } from '../../services/attendance-checkin.service';
import { DeviceAuthModalService } from '../../services/device-auth-modal.service';

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
  private checkInService = inject(AttendanceCheckInService);
  private modalService = inject(DeviceAuthModalService);
  private router = inject(Router);

  @Input() pageTitle = 'Dashboard';
  @Input() pageIcon = 'dashboard';
  @Input() parentTitle?: string;

  @Output() toggleMobileMenu = new EventEmitter<void>();

  currentUser = this.authService.currentUser;
  userRoles = this.authService.userRoles;

  get primaryRole(): string {
    const roles = this.userRoles();
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('TC')) return 'TC';
    return '';
  }
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
    if (this.checkInService.hasCheckedInToday()) {
      this.modalService.show({
        title: 'Checkout Required',
        message: 'You are currently checked in for attendance. You must check out on the dashboard before logging out of the system.'
      });
      return;
    }
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  get roleBadgeClass(): string {
    const role = this.primaryRole;
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'TL': return 'badge-tl';
      case 'TC': return 'badge-tc';
      default: return '';
    }
  }
}
