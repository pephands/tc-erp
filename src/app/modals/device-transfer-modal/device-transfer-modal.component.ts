import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceTransferModalService } from '../../services/device-transfer-modal.service';

@Component({
  selector: 'app-device-transfer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-transfer-modal.component.html',
  styleUrl: './device-transfer-modal.component.css'
})
export class DeviceTransferModalComponent {
  modalService = inject(DeviceTransferModalService);

  isOpen = this.modalService.isOpen;
  formattedCode = this.modalService.formattedCode;
  countdownDisplay = this.modalService.countdownDisplay;
  isLoading = this.modalService.isLoading;
  errorMessage = this.modalService.errorMessage;

  copied = false;

  onClose(): void {
    this.modalService.close();
  }

  onRefresh(): void {
    this.modalService.refreshCode();
  }

  copyCode(): void {
    const raw = this.modalService.code();
    if (raw && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(raw).then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      });
    }
  }
}
