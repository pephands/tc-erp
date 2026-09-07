import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DeviceAuthModalService } from '../../services/device-auth-modal.service';

@Component({
  selector: 'app-device-auth-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-auth-modal.component.html',
  styleUrl: './device-auth-modal.component.css'
})
export class DeviceAuthModalComponent {
  modalService = inject(DeviceAuthModalService);
  private router = inject(Router);

  isOpen = this.modalService.isOpen;
  config = this.modalService.config;

  onClose(): void {
    this.modalService.close();
  }

  onGoToDashboard(): void {
    this.modalService.close();
    this.router.navigate(['/dashboard']);
  }
}
