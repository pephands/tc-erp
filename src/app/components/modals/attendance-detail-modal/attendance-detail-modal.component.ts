import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-attendance-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-detail-modal.component.html',
  styleUrl: './attendance-detail-modal.component.css'
})
export class AttendanceDetailModalComponent {
  @Input() attendance: any = null;
  @Output() closeModal = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);

  onClose() {
    this.closeModal.emit();
  }

  get agentName(): string {
    return this.attendance?.tcName || '';
  }

  get agentId(): string {
    return this.attendance?.tcId ? `@${this.attendance.tcId}` : '';
  }

  get dateFormatted(): string {
    return this.attendance?.attendanceDate || '';
  }

  get checkInTime(): string {
    return this.attendance?.inTime || '--:--';
  }

  get checkOutTime(): string {
    return this.attendance?.outTime || '--:--';
  }

  get status(): string {
    return this.attendance?.status || '';
  }

  get workMode(): string {
    return this.attendance?.originalItem?.work_mode || (this.attendance?.originalItem?.is_wfh ? 'WFH' : 'Office');
  }

  get branchName(): string {
    return this.attendance?.branchName || '';
  }

  get totalDuration(): string {
    if (this.attendance?.originalItem?.total_working_minutes) {
      const mins = this.attendance.originalItem.total_working_minutes;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    return '--';
  }

  get latitude(): string {
    return this.attendance?.originalItem?.latitude || '';
  }

  get longitude(): string {
    return this.attendance?.originalItem?.longitude || '';
  }

  get hasLocation(): boolean {
    return !!(this.latitude && this.longitude);
  }

  get mapUrl(): string {
    if (this.hasLocation) {
      return `https://www.google.com/maps?q=${this.latitude},${this.longitude}`;
    }
    return '#';
  }

  get mapEmbedUrl(): SafeResourceUrl {
    if (this.hasLocation) {
      const url = `https://maps.google.com/maps?q=${this.latitude},${this.longitude}&z=15&output=embed`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return '';
  }

  get latitudeOut(): string {
    return this.attendance?.originalItem?.latitude_out || '';
  }

  get longitudeOut(): string {
    return this.attendance?.originalItem?.longitude_out || '';
  }

  get hasLocationOut(): boolean {
    return !!(this.latitudeOut && this.longitudeOut);
  }

  get mapUrlOut(): string {
    if (this.hasLocationOut) {
      return `https://www.google.com/maps?q=${this.latitudeOut},${this.longitudeOut}`;
    }
    return '#';
  }

  get mapEmbedUrlOut(): SafeResourceUrl {
    if (this.hasLocationOut) {
      const url = `https://maps.google.com/maps?q=${this.latitudeOut},${this.longitudeOut}&z=15&output=embed`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return '';
  }

  get distanceText(): string | null {
    if (this.hasLocation && this.hasLocationOut) {
      const lat1 = parseFloat(this.latitude);
      const lon1 = parseFloat(this.longitude);
      const lat2 = parseFloat(this.latitudeOut);
      const lon2 = parseFloat(this.longitudeOut);
      
      if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // in metres
        
        if (d < 1000) {
          return `${Math.round(d)} meters apart`;
        } else {
          return `${(d / 1000).toFixed(2)} km apart`;
        }
      }
    }
    return null;
  }

  get ipAddress(): string {
    return this.attendance?.originalItem?.ip_address || '--';
  }

  get ipAddressOut(): string {
    return this.attendance?.originalItem?.ip_address_out || '--';
  }

  get hasCheckOut(): boolean {
    return this.checkOutTime !== '--:--' || this.hasLocationOut;
  }
}
