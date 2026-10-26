import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SecurityNoticeModalService } from '../../services/security-notice-modal.service';

@Component({
  selector: 'app-security-notice-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-notice-modal.component.html',
  styleUrl: './security-notice-modal.component.css'
})
export class SecurityNoticeModalComponent {
  modalService = inject(SecurityNoticeModalService);
  private router = inject(Router);

  isOpen = this.modalService.isOpen;
  config = this.modalService.config;

  onClose(): void {
    this.modalService.close();
    this.router.navigate(['/login']);
  }

  onAcknowledge(): void {
    this.modalService.close();
    this.router.navigate(['/login']);
  }
}
