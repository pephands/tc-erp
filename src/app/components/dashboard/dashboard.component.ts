import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AttendanceCheckInService, LocationCoordinates, AttendanceCheckInPayload } from '../../services/attendance-checkin.service';
import { AttendanceCheckOutService, AttendanceCheckOutPayload } from '../../services/attendance-checkout.service';
import { AttendanceTodayService } from '../../services/attendance-today.service';
import { ToastService } from '../../services/toast.service';

export type CheckInStatusState = 'IDLE' | 'LOCATING' | 'SUBMITTING' | 'MARKED' | 'REJECTED' | 'COMPLETED';

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
  private checkOutService = inject(AttendanceCheckOutService);
  private todayService = inject(AttendanceTodayService);
  private toastService = inject(ToastService);

  currentUser = this.authService.currentUser;
  userRoles = this.authService.userRoles;

  get primaryRole(): string {
    const roles = this.userRoles();
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('TC')) return 'TC';
    return '';
  }

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
    this.syncAttendanceState();
  }

  private syncAttendanceState(): void {
    this.todayService.getData().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          
          if (res.data.attendance) {
            if (res.data.attendance.in_time) {
              this.checkInTime.set(this.formatTimeString(res.data.attendance.in_time));
            }
            if (res.data.attendance.out_time) {
              this.checkOutTime.set(this.formatTimeString(res.data.attendance.out_time));
            }
          }

          if (res.data.has_checked_out) {
            this.statusState.set('COMPLETED');
            this.checkInService.clearAttendanceMarked();
          } else if (res.data.has_checked_in) {
            this.statusState.set('MARKED');
            if (!this.checkInTime()) {
              const savedTime = this.checkInService.getCheckInTime();
              this.checkInTime.set(savedTime || '-- : --');
            }
          } else {
            this.statusState.set('IDLE');
          }
        }
      },
      error: () => {
        // Fallback to local storage if API fails
        if (this.checkInService.hasCheckedInToday()) {
          this.statusState.set('MARKED');
          const savedTime = this.checkInService.getCheckInTime();
          this.checkInTime.set(savedTime || '-- : --');
        }
      }
    });
  }

  private formatTimeString(timeStr: string): string {
    if (!timeStr) return '-- : --';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    const formattedM = m < 10 ? '0' + m : m;
    return `${formattedH < 10 ? '0' + formattedH : formattedH}:${formattedM} ${ampm}`;
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
    let currentDeviceId = this.checkInService.getDeviceId();
    if (!currentDeviceId) {
      currentDeviceId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
      this.checkInService.setDeviceId(currentDeviceId);
    }

    const payload: AttendanceCheckInPayload = {
      userId: this.currentUser()?.id,
      userName: this.currentUser()?.full_name,
      userRole: this.primaryRole || undefined,
      latitude: coords.latitude,
      longitude: coords.longitude,
      ipAddress: this.clientIp(),
      timestamp: now.toISOString(),
      deviceid: currentDeviceId
    };

    // Submit payload to backend
    this.checkInService.submitCheckIn(payload).subscribe({
      next: (res: any) => {
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        // Backend responds with res.data.id for the attendance record
        this.checkInService.setAttendanceMarked(res?.data?.id, timeStr);
        this.statusState.set('MARKED');
        this.checkInTime.set(timeStr);
        this.toastService.success('Attendance Marked Successfully', `Verified and recorded at ${timeStr}. ERP device session active.`);
      },
      error: (err) => {
        this.statusState.set('IDLE');
        
        let errorMsg = 'Failed to record attendance. Please try again.';
        
        // Handle DRF ValidationError format
        if (err.error) {
          if (Array.isArray(err.error)) {
             errorMsg = err.error[0];
          } else if (typeof err.error === 'object') {
             // Extract the first error message from the object values
             const firstKey = Object.keys(err.error)[0];
             if (firstKey) {
               const val = err.error[firstKey];
               errorMsg = Array.isArray(val) ? val[0] : val;
             }
          } else if (typeof err.error === 'string') {
             errorMsg = err.error;
          }
        }
        
        this.toastService.error('Check-in Rejected', errorMsg);
      }
    });
  }

  async onCheckOut(): Promise<void> {
    const attendanceId = this.checkInService.getAttendanceId();
    if (!attendanceId) {
      this.toastService.error('Checkout Failed', 'No active attendance record found for today.');
      return;
    }

    try {
      const coords = await this.checkInService.getCurrentLocation();
      const payload: AttendanceCheckOutPayload = {
        attendance_id: attendanceId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        ip_address: this.clientIp(),
        deviceid: this.checkInService.getDeviceId() || undefined
      };

      this.checkOutService.getData(payload).subscribe({
        next: () => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          this.checkOutTime.set(timeStr);
          this.checkInService.clearAttendanceMarked();
          this.statusState.set('COMPLETED');
          this.toastService.info('Check-Out Recorded', `Check-out recorded at ${timeStr}. Device authorization session cleared.`);
        },
        error: () => {
          this.checkInService.clearAttendanceMarked();
          this.statusState.set('COMPLETED');
          this.toastService.error('Checkout Failed', 'Failed to record checkout on the server.');
        }
      });
    } catch (err) {
      this.toastService.error('Location Error', 'Failed to get location for checkout.');
    }
  }

  onRetry(): void {
    this.statusState.set('IDLE');
    this.locationError.set(null);
    this.rejectionReason.set(null);
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
