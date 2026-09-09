import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AttendanceCheckInService, LocationCoordinates, AttendanceCheckInPayload } from '../../services/attendance-checkin.service';
import { AttendanceCheckOutService, AttendanceCheckOutPayload } from '../../services/attendance-checkout.service';
import { AttendanceTodayService } from '../../services/attendance-today.service';
import { ToastService } from '../../services/toast.service';
import { WFHPasscodeService, WFHPasscodeRecord } from '../../services/wfh-passcode.service';
import { UserListService } from '../../services/user-list.service';
import { BranchListService } from '../../services/branch-list.service';

export type CheckInStatusState = 'IDLE' | 'LOCATING' | 'SUBMITTING' | 'MARKED' | 'REJECTED' | 'COMPLETED';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private checkInService = inject(AttendanceCheckInService);
  private checkOutService = inject(AttendanceCheckOutService);
  private todayService = inject(AttendanceTodayService);
  private toastService = inject(ToastService);
  private wfhService = inject(WFHPasscodeService);
  private userListService = inject(UserListService);
  private branchListService = inject(BranchListService);

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

  // WFH Staff State
  isWfhMode = signal<boolean>(false);
  isWfhRequired = signal<boolean>(false);
  wfhPasscode = signal<string>('');
  isWfhMarked = signal<boolean>(false);

  // TL / Admin WFH Passcode Management State
  staffUsers = signal<any[]>([]);
  selectedStaffId = signal<number | null>(null);
  todayPasscodes = signal<WFHPasscodeRecord[]>([]);
  isGeneratingPasscode = signal<boolean>(false);
  lastGeneratedPasscode = signal<WFHPasscodeRecord | null>(null);
  copiedCode = signal<string | null>(null);

  // Filters State
  branches = signal<any[]>([]);
  selectedBranch = signal<number | null>(null);
  selectedRole = signal<string | null>(null);
  availableRoles = signal<any[]>([
    { code: 'TL', name: 'Team Leader' },
    { code: 'TC', name: 'Telecaller' }
  ]);

  ngOnInit(): void {
    this.startLiveClock();
    this.fetchInitialDeviceInfo();
    this.syncAttendanceState();

    if (this.primaryRole === 'ADMIN' || this.primaryRole === 'TL') {
      this.loadBranches();
      this.loadStaffUsers();
      this.loadTodayPasscodes();
    }
  }

  loadBranches(): void {
    this.branchListService.getData().subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          this.branches.set(res.data);
        }
      },
      error: () => {}
    });
  }

  onRequestWfh(): void {
    this.wfhService.requestPasscode().subscribe({
      next: (res: any) => {
        this.toastService.success('WFH Requested', res.message || 'Passcode requested successfully.');
        this.isWfhMode.set(true);
      },
      error: (err: any) => {
        this.toastService.error('Request Failed', err.error?.message || 'Could not request WFH passcode.');
      }
    });
  }

  loadStaffUsers(): void {
    const branchId = this.selectedBranch();
    const roleCode = this.selectedRole();
    
    this.userListService.getUsers(branchId, roleCode).subscribe({
      next: (res: any) => {
        const users = Array.isArray(res) ? res : (res?.data || []);
        this.staffUsers.set(users.filter((u: any) => u.is_active));
        this.selectedStaffId.set(null); // Reset selection when list updates
      },
      error: () => {}
    });
  }

  onFilterChange(): void {
    this.loadStaffUsers();
  }

  loadTodayPasscodes(): void {
    this.wfhService.getPasscodes().subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          this.todayPasscodes.set(res.data);
        }
      },
      error: () => {}
    });
  }

  onGeneratePasscode(): void {
    const staffId = this.selectedStaffId();
    if (!staffId) {
      this.toastService.error('Selection Required', 'Please select a staff member to generate a WFH passcode.');
      return;
    }

    this.isGeneratingPasscode.set(true);
    this.wfhService.generatePasscode(staffId).subscribe({
      next: (res: any) => {
        this.isGeneratingPasscode.set(false);
        if (res.status === 'success' && res.data) {
          this.lastGeneratedPasscode.set(res.data);
          this.toastService.success('Passcode Generated', res.message || 'WFH Passcode ready to share.');
          this.loadTodayPasscodes();
        } else {
          this.toastService.error('Error', 'Failed to generate passcode.');
        }
      },
      error: (err: any) => {
        this.isGeneratingPasscode.set(false);
        this.toastService.error('Generation Failed', err?.error?.message || 'Server error generating passcode.');
      }
    });
  }

  copyPasscode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copiedCode.set(code);
        this.toastService.info('Copied', `Passcode ${code} copied to clipboard!`);
        setTimeout(() => {
          if (this.copiedCode() === code) {
            this.copiedCode.set(null);
          }
        }, 3000);
      });
    }
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
            if (res.data.attendance.is_wfh) {
              this.isWfhMarked.set(true);
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
            if (this.checkInService.isWfhToday()) {
              this.isWfhMarked.set(true);
            }
          } else {
            this.statusState.set('IDLE');
          }
        }
      },
      error: () => {
        if (this.checkInService.hasCheckedInToday()) {
          this.statusState.set('MARKED');
          const savedTime = this.checkInService.getCheckInTime();
          this.checkInTime.set(savedTime || '-- : --');
          if (this.checkInService.isWfhToday()) {
            this.isWfhMarked.set(true);
          }
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
    if (this.isWfhMode() && !this.wfhPasscode().trim()) {
      this.toastService.error('Passcode Required', 'Please enter your 6-character WFH passcode provided by your Team Leader.');
      return;
    }

    // Try refreshing public IP if currently fallback 127.0.0.1
    if (this.clientIp() === '127.0.0.1' || !this.clientIp()) {
      try {
        const freshIp = await firstValueFrom(this.checkInService.getClientIp());
        if (freshIp) {
          this.clientIp.set(freshIp);
        }
      } catch (_) {}
    }

    this.statusState.set('LOCATING');
    this.locationError.set(null);
    this.rejectionReason.set(null);

    let coords: LocationCoordinates | null = null;
    try {
      coords = await this.checkInService.getCurrentLocation();
      this.locationCoords.set(coords);
    } catch (err: any) {
      if (!this.isWfhMode()) {
        this.statusState.set('IDLE');
        this.toastService.error('Location Access Failed', 'Could not detect your current location. Please ensure location permissions are enabled in your browser.');
        return;
      }
      this.locationError.set('Location not available. Proceeding with WFH check-in.');
    }

    this.statusState.set('SUBMITTING');

    const now = new Date();
    let currentDeviceId = this.checkInService.getDeviceId();
    if (!currentDeviceId) {
      currentDeviceId = `DEV-${Math.floor(100000 + Math.random() * 900000)}`;
      this.checkInService.setDeviceId(currentDeviceId);
    }

    const isWfh = this.isWfhMode();
    const payload: AttendanceCheckInPayload = {
      userId: this.currentUser()?.id,
      userName: this.currentUser()?.full_name,
      userRole: this.primaryRole || undefined,
      latitude: coords ? coords.latitude : undefined,
      longitude: coords ? coords.longitude : undefined,
      ipAddress: this.clientIp(),
      timestamp: now.toISOString(),
      deviceid: currentDeviceId,
      is_wfh: isWfh,
      override_code: isWfh ? this.wfhPasscode().trim().toUpperCase() : undefined
    };

    // Submit payload to backend
    this.checkInService.submitCheckIn(payload).subscribe({
      next: (res: any) => {
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        this.checkInService.setAttendanceMarked(res?.data?.id, timeStr, isWfh);
        this.statusState.set('MARKED');
        this.checkInTime.set(timeStr);
        if (isWfh) {
          this.isWfhMarked.set(true);
        }
        this.toastService.success(
          isWfh ? 'WFH Attendance Marked' : 'Attendance Marked Successfully',
          `Verified and recorded at ${timeStr}. ERP device session active.`
        );
      },
      error: (err) => {
        this.statusState.set('IDLE');
        
        let errorMsg = 'Failed to record attendance. Please try again.';
        if (err.error) {
          if (Array.isArray(err.error)) {
             errorMsg = err.error[0];
          } else if (typeof err.error === 'object') {
             const firstKey = Object.keys(err.error)[0];
             if (firstKey) {
               const val = err.error[firstKey];
               errorMsg = Array.isArray(val) ? val[0] : val;
             }
          } else if (typeof err.error === 'string') {
             errorMsg = err.error;
          }
        }
        
        if (errorMsg.includes('IP Mismatch') || errorMsg.includes('Geofence')) {
          this.isWfhRequired.set(true);
          this.toastService.error('Off-site Location Detected', 'You are not within the authorized network/location. Please request WFH.');
        } else {
          this.toastService.error('Check-in Rejected', errorMsg);
        }
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
    this.isWfhRequired.set(false);
    this.isWfhMode.set(false);
    this.wfhPasscode.set('');
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
