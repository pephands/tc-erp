import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;

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
