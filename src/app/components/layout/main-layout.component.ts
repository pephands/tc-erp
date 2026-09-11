import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent, ActiveMenuEvent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  isSidebarCollapsed = signal<boolean>(false);
  isMobileDrawerOpen = signal<boolean>(false);

  pageTitle = signal<string>('Dashboard');
  pageIcon = signal<string>('dashboard');
  parentTitle = signal<string | undefined>(undefined);

  constructor() {
    // Listen to router navigation events to auto-update header titles
    this.updateHeaderFromUrl(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateHeaderFromUrl(event.urlAfterRedirects || event.url);
    });
  }

  private updateHeaderFromUrl(url: string): void {
    if (url.includes('/branches')) {
      this.pageTitle.set('Branch Details');
      this.pageIcon.set('domain');
      this.parentTitle.set('Branches');
    } else if (url.includes('/managers')) {
      this.pageTitle.set('Manager Details');
      this.pageIcon.set('manage_accounts');
      this.parentTitle.set('Managers');
    } else if (url.includes('/telecallers')) {
      this.pageTitle.set('TeleCallers Details');
      this.pageIcon.set('support_agent');
      this.parentTitle.set('TeleCallers');
    } else if (url.includes('/attendance')) {
      this.pageTitle.set('Attendance Details');
      this.pageIcon.set('event_available');
      this.parentTitle.set('Attendance');
    } else if (url.includes('/approve-assign')) {
      this.pageTitle.set('Assign / Approve Task');
      this.pageIcon.set('groups');
      this.parentTitle.set('Task Management');
    } else if (url.includes('/branch-documents')) {
      this.pageTitle.set('Branch Document Details');
      this.pageIcon.set('folder_shared');
      this.parentTitle.set('Branch Details');
    } else if (url.includes('/expense-details')) {
      this.pageTitle.set('Expense Details');
      this.pageIcon.set('receipt_long');
      this.parentTitle.set('Branch Details');
    } else if (url.includes('/expense-report')) {
      this.pageTitle.set('Expense Report');
      this.pageIcon.set('bar_chart');
      this.parentTitle.set('Branch Details');
    } else {
      this.pageTitle.set('Dashboard');
      this.pageIcon.set('dashboard');
      this.parentTitle.set(undefined);
    }
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update(v => !v);
  }

  closeMobileDrawer(): void {
    this.isMobileDrawerOpen.set(false);
  }

  onMenuSelect(event: ActiveMenuEvent): void {
    this.pageTitle.set(event.label);
    this.pageIcon.set(event.icon);
    this.parentTitle.set(event.parentLabel);
  }

  onLogout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
