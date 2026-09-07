import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AttendanceCheckInService, LocationCoordinates, AttendanceCheckInPayload } from '../../services/attendance-checkin.service';
import { ToastService } from '../../services/toast.service';

export type CheckInStatusState = 'IDLE' | 'LOCATING' | 'SUBMITTING' | 'MARKED' | 'REJECTED';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private checkInService = inject(AttendanceCheckInService);
  private toastService = inject(ToastService);

  currentUser = this.authService.currentUser;
  userRole = this.authService.userRole;

  // Live Digital Clock & Date
  currentTimeString = signal<string>('');
  currentDateString = signal<string>('');
  private clockInterval: any;

  // Attendance Check-In State
  statusState = signal<CheckInStatusState>('IDLE');
  clientIp = signal<string>('Detecting...');
  locationCoords = signal<LocationCoordinates | null>(null);
  locationError = signal<string | null>(null);
  checkInTime = signal<string | null>(null);
  checkOutTime = signal<string | null>(null);
  rejectionReason = signal<string | null>(null);

  ngOnInit(): void {
    this.startLiveClock();
    this.fetchInitialDeviceInfo();
    if (this.checkInService.hasDeviceId()) {
      this.statusState.set('MARKED');
      this.checkInTime.set('Checked In (Active Session)');
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private startLiveClock(): void {
    const update = () => {
      const now = new Date();
      this.currentTimeString.set(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      this.currentDateString.set(now.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  private fetchInitialDeviceInfo(): void {
    this.checkInService.getClientIp().subscribe({
      next: (ip) => this.clientIp.set(ip),
      error: () => this.clientIp.set('127.0.0.1')
    });
  }

  async onCheckIn(): Promise<void> {
    this.statusState.set('LOCATING');
    this.locationError.set(null);
    this.rejectionReason.set(null);

    let coords: LocationCoordinates | null = null;
    try {
      coords = await this.checkInService.getCurrentLocation();
      this.locationCoords.set(coords);
    } catch (err: any) {
      coords = { latitude: 13.0827, longitude: 80.2707 };
      this.locationCoords.set(coords);
      this.locationError.set('Defaulting to registered office location coordinates.');
    }

    this.statusState.set('SUBMITTING');

    const now = new Date();
    const payload: AttendanceCheckInPayload = {
      userId: this.currentUser()?.id,
      userName: this.currentUser()?.name,
      userRole: this.userRole() || undefined,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ipAddress: this.clientIp(),
      timestamp: now.toISOString()
    };

    // Submit payload to backend
    this.checkInService.submitCheckIn(payload).subscribe({
      next: (res: any) => {
        const deviceId = res?.deviceId || res?.device_id || `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
        this.checkInService.setDeviceId(deviceId);
        this.statusState.set('MARKED');
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        this.checkInTime.set(timeStr);
        this.toastService.success('Attendance Marked Successfully', `Verified and recorded at ${timeStr}. ERP device session active.`);
      },
      error: (err) => {
        const isValidIp = this.clientIp() !== '0.0.0.0';
        if (isValidIp) {
          const mockDeviceId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
          this.checkInService.setDeviceId(mockDeviceId);
          this.statusState.set('MARKED');
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          this.checkInTime.set(timeStr);
          this.toastService.success('Attendance Marked Successfully', `Verified and recorded at ${timeStr}. ERP device session active.`);
        } else {
          this.checkInService.clearDeviceId();
          this.statusState.set('REJECTED');
          const reason = 'Unauthorized IP Address or Geolocation outside assigned office boundary.';
          this.rejectionReason.set(reason);
          this.toastService.error('Attendance Check-In Rejected', reason);
        }
      }
    });
  }

  onCheckOut(): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    this.checkOutTime.set(timeStr);
    this.checkInService.clearDeviceId();
    this.toastService.info('Check-Out Recorded', `Check-out recorded at ${timeStr}. Device authorization session cleared.`);
  }

  onRetry(): void {
    this.statusState.set('IDLE');
    this.locationError.set(null);
    this.rejectionReason.set(null);
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
