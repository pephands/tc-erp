import { Component, inject, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AttendanceCheckInService, LocationCoordinates, AttendanceCheckInPayload } from '../../services/attendance-checkin.service';
import { AttendanceCheckOutService, AttendanceCheckOutPayload } from '../../services/attendance-checkout.service';
import { AttendanceTodayService } from '../../services/attendance-today.service';
import { ToastService } from '../../services/toast.service';
import { WFHPasscodeService, WFHPasscodeRecord } from '../../services/wfh-passcode.service';
import { UserListService } from '../../services/user-list.service';
import { BranchListService } from '../../services/branch-list.service';
import { UserOtpAdminService, UserOTPRecord } from '../../services/user-otp-admin.service';

import { HttpClient } from '@angular/common/http';
import { Endpoint } from '../../http/endpoint';

export type CheckInStatusState = 'IDLE' | 'LOCATING' | 'SUBMITTING' | 'MARKED' | 'REJECTED' | 'COMPLETED';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private endpoint = inject(Endpoint);
  private router = inject(Router);
  private authService = inject(AuthService);
  private checkInService = inject(AttendanceCheckInService);
  private checkOutService = inject(AttendanceCheckOutService);
  private todayService = inject(AttendanceTodayService);
  private toastService = inject(ToastService);
  private wfhService = inject(WFHPasscodeService);
  private userListService = inject(UserListService);
  private branchListService = inject(BranchListService);
  private userOtpAdminService = inject(UserOtpAdminService);

  currentUser = this.authService.currentUser;
  userRoles = this.authService.userRoles;
  dashboardMetrics = signal<any>(null);

  get primaryRole(): string {
    const roles = this.userRoles();
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    if (roles.includes('SUPERINTENDENT')) return 'SUPERINTENDENT';
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('TC')) return 'TC';
    return roles.length > 0 ? roles[0] : '';
  }

  // Device & Role Check for Attendance Restrictions (TC and TL mobile-only)
  checkIfMobilePhone(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();

    // 1. Explicitly check for Tablets and exclude them
    const isIpad = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isTablet = /tablet|playbook|silk|kindle/i.test(ua);
    const isAndroidTablet = /android/i.test(ua) && !/mobile/i.test(ua);
    if (isIpad || isTablet || isAndroidTablet) {
      return false;
    }

    // 2. Explicitly check for Desktop platforms
    const isDesktopOs = /windows nt|macintosh|x11|cros/i.test(ua) && !/mobile|phone/i.test(ua);
    if (isDesktopOs) {
      return false;
    }

    // 3. Confirm Mobile Phone signatures
    const isIphoneOrIpod = /iphone|ipod/i.test(ua);
    const isAndroidPhone = /android/i.test(ua) && /mobile/i.test(ua);
    const isOtherMobile = /mobile|phone|opera mobi|opera mini|iemobile|fennec/i.test(ua);

    if (isIphoneOrIpod || isAndroidPhone || isOtherMobile) {
      return true;
    }

    return false;
  }

  isMobileDevice = signal<boolean>(this.checkIfMobilePhone());

  @HostListener('window:resize')
  onWindowResize(): void {
    this.isMobileDevice.set(this.checkIfMobilePhone());
  }

  readonly isMobileAttendanceRequired = computed(() => {
    const roles = this.userRoles();
    if (roles.includes('ADMIN') || this.primaryRole === 'ADMIN') {
      return false;
    }
    const isTc = roles.includes('TC') || roles.includes('TELECALLER') || roles.includes('TELE CALLER') || this.primaryRole === 'TC';
    const isTl = roles.includes('TL') || roles.includes('TEAM LEADER') || roles.includes('TEAM LEAD') || this.primaryRole === 'TL';
    return isTc || isTl;
  });

  readonly isDesktopBlockedForAttendance = computed(() => {
    return this.isMobileAttendanceRequired() && !this.isMobileDevice();
  });

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
  showLocationInstructionsModal = signal<boolean>(false);
  isWfhRequired = signal<boolean>(false);
  wfhPasscode = signal<string>('');
  isWfhMarked = signal<boolean>(false);

  // Check-Out Confirmation Modal State
  showCheckOutModal = signal<boolean>(false);
  isCheckingOut = signal<boolean>(false);

  // TL / Admin WFH Passcode Management State
  staffUsers = signal<any[]>([]);
  selectedStaffId = signal<number | null>(null);
  staffSearchText = signal<string>('');
  selectedStaffName = signal<string | null>(null);
  todayPasscodes = signal<WFHPasscodeRecord[]>([]);
  isGeneratingPasscode = signal<boolean>(false);
  lastGeneratedPasscode = signal<WFHPasscodeRecord | null>(null);
  copiedCode = signal<string | null>(null);
  isStaffDropdownOpen = signal<boolean>(false);

  // Admin UserOTP Management State
  userOtpList = signal<UserOTPRecord[]>([]);
  isLoadingUserOtps = signal<boolean>(false);
  selectedOtpBranch = signal<number | null>(null);
  otpSearchText = signal<string>('');
  copiedOtpCode = signal<string | null>(null);
  private otpTimerInterval: any = null;
  private otpSearchTimeout: any = null;
  
  selectStaff(staff: any): void {
    this.selectedStaffId.set(staff.id);
    this.selectedStaffName.set(staff.label);
    this.isStaffDropdownOpen.set(false);
  }

  private searchTimeout: any;

  onStaffSearchChange(val: string): void {
    this.staffSearchText.set(val);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!val || val.length < 2) {
      this.staffUsers.set([]);
      this.selectedStaffId.set(null);
      this.selectedStaffName.set(null);
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.userListService.searchDropdownUsers(val).subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          this.staffUsers.set(list); // now contains objects with id and label
          
          const matched = list.find((s: any) => 
            s.employee_Id && s.employee_Id.toLowerCase() === val.toLowerCase()
          );
          if (matched) {
            this.selectedStaffId.set(matched.id);
            this.selectedStaffName.set(matched.label);
          } else {
            this.selectedStaffId.set(null);
            this.selectedStaffName.set(null);
          }
        },
        error: (err: any) => console.error('Error fetching staff search', err)
      });
    }, 400);
  }

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
    this.loadDashboardMetrics();

    if (this.primaryRole === 'ADMIN' || this.primaryRole === 'TL') {
      this.loadBranches();
      this.loadStaffUsers();
      this.loadTodayPasscodes();
    }

    if (this.primaryRole === 'ADMIN' || this.primaryRole === 'TL') {
      this.loadAdminUserOtps();
      this.startOtpTimer();
    }

    // Refresh user session data from backend to ensure roles/branches are up to date
    this.authService.fetchLatestSession().subscribe();
  }

  loadDashboardMetrics(): void {
    const url = this.endpoint.dashboardSummary;
    const token = this.authService.currentSession()?.token;
    const headers: { [header: string]: string } = token ? { Authorization: `Token ${token}` } : {};
    this.http.get<any>(url, { headers }).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success' && res.data) {
          this.dashboardMetrics.set(res.data);
        }
      },
      error: (err: any) => console.error('Error loading dashboard metrics:', err)
    });
  }

  loadBranches(): void {
    this.branchListService.getData(1, 1000, undefined, 'true').subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          this.branches.set(res.data);
        }
      },
      error: () => {}
    });
  }

  onRequestWfh(): void {
    const user = this.currentUser();
    const payload = {
      user_id: user?.id,
      employee_Id: user?.employee_Id,
      date: new Date().toLocaleDateString('en-CA')
    };

    this.wfhService.requestPasscode(payload).subscribe({
      next: (res: any) => {
        this.wfhPasscode.set('');
        this.toastService.success('WFH Requested', res.message || 'WFH Passcode requested successfully. Please contact your Team Leader to receive your code.');
        this.isWfhMode.set(true);
      },
      error: (err: any) => {
        this.toastService.error('Request Failed', err.error?.message || 'Could not request WFH passcode.');
      }
    });
  }

  loadStaffUsers(): void {
    this.staffUsers.set([]);
    this.selectedStaffId.set(null);
    this.staffSearchText.set('');
    this.selectedStaffName.set(null);
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
          this.staffSearchText.set('');
          this.selectedStaffName.set(null);
          this.selectedStaffId.set(null);
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

  loadAdminUserOtps(): void {
    if (this.primaryRole !== 'ADMIN' && this.primaryRole !== 'TL') return;
    this.isLoadingUserOtps.set(true);
    this.userOtpAdminService.getUserOtps(this.selectedOtpBranch(), this.otpSearchText()).subscribe({
      next: (res: any) => {
        this.isLoadingUserOtps.set(false);
        if (res && res.status === 'success' && res.data) {
          const activeOnly = res.data.filter((item: UserOTPRecord) => item.is_valid && item.expires_in_seconds > 0);
          this.userOtpList.set(activeOnly);
        } else if (Array.isArray(res)) {
          const activeOnly = res.filter((item: UserOTPRecord) => item.is_valid && item.expires_in_seconds > 0);
          this.userOtpList.set(activeOnly);
        }
      },
      error: () => {
        this.isLoadingUserOtps.set(false);
      }
    });
  }

  onOtpFilterBranchChange(branchId: any): void {
    const val = branchId ? Number(branchId) : null;
    this.selectedOtpBranch.set(val);
    this.loadAdminUserOtps();
  }

  onOtpSearchChange(term: string): void {
    this.otpSearchText.set(term);
    if (this.otpSearchTimeout) clearTimeout(this.otpSearchTimeout);
    this.otpSearchTimeout = setTimeout(() => {
      this.loadAdminUserOtps();
    }, 300);
  }

  copyOtpCode(code: string): void {
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copiedOtpCode.set(code);
        this.toastService.info('Copied', `OTP ${code} copied to clipboard!`);
        setTimeout(() => {
          if (this.copiedOtpCode() === code) {
            this.copiedOtpCode.set(null);
          }
        }, 3000);
      });
    }
  }

  formatOtpCountdown(seconds: number): string {
    if (!seconds || seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }

  startOtpTimer(): void {
    this.stopOtpTimer();
    this.otpTimerInterval = setInterval(() => {
      this.userOtpList.update(list =>
        list
          .map(item => {
            const nextSec = item.expires_in_seconds - 1;
            return {
              ...item,
              expires_in_seconds: nextSec,
              is_valid: nextSec > 0
            };
          })
          .filter(item => item.is_valid && item.expires_in_seconds > 0)
      );
    }, 1000);
  }

  stopOtpTimer(): void {
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
      this.otpTimerInterval = null;
    }
  }

  private syncAttendanceState(): void {
    this.todayService.getData().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          if (res.data.attendance) {
            if (res.data.attendance.in_time) {
              this.checkInTime.set(this.formatTimeString(res.data.attendance.in_time));
            } else {
              this.checkInTime.set(null);
            }
            if (res.data.attendance.out_time) {
              this.checkOutTime.set(this.formatTimeString(res.data.attendance.out_time));
            } else {
              this.checkOutTime.set(null);
            }
            if (res.data.attendance.is_wfh) {
              this.isWfhMarked.set(true);
            } else {
              this.isWfhMarked.set(false);
            }
          } else {
            this.checkInTime.set(null);
            this.checkOutTime.set(null);
            this.isWfhMarked.set(false);
          }

          if (res.data.has_checked_out) {
            this.statusState.set('COMPLETED');
            this.checkInService.clearAttendanceMarked();
          } else if (res.data.has_checked_in) {
            this.statusState.set('MARKED');
            this.checkOutTime.set(null);
            
            // Re-populate localStorage so guards pass
            if (res.data.attendance) {
              this.checkInService.setAttendanceMarked(res.data.attendance.id, res.data.attendance.in_time, res.data.attendance.is_wfh);
            } else {
              this.checkInService.setAttendanceMarked();
            }
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('tc_erp_has_checked_out_date');
            }

            if (!this.checkInTime()) {
              const savedTime = this.checkInService.getCheckInTime();
              this.checkInTime.set(savedTime || '-- : --');
            }
            if (this.checkInService.isWfhToday()) {
              this.isWfhMarked.set(true);
            }
          } else {
            this.statusState.set('IDLE');
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('tc_erp_has_checked_out_date');
            }
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
    this.stopOtpTimer();
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
    if (this.isDesktopBlockedForAttendance()) {
      this.toastService.error(
        'Mobile Device Required',
        'Check-in and check-out are only allowed from a mobile device. Desktop, laptop, and tablet devices are not permitted.'
      );
      return;
    }

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
        this.showLocationInstructionsModal.set(true);
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
        this.checkOutTime.set(null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('tc_erp_has_checked_out_date');
        }
        if (isWfh) {
          this.isWfhMarked.set(true);
        }
        this.toastService.success(
          isWfh ? 'WFH Attendance Marked' : 'Attendance Marked Successfully',
          `Verified and recorded at ${timeStr}. ERP device session active.`
        );
        setTimeout(() => {
          window.location.reload();
        }, 800);
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
        
        if (
          err?.status === 401 ||
          err?.status === 403 ||
          errorMsg.includes('Invalid token') ||
          errorMsg.includes('Authentication credentials were not provided')
        ) {
          this.authService.forceSessionLogout('session_transferred');
          this.router.navigate(['/login'], {
            queryParams: { sessionTransferred: 'true' },
            replaceUrl: true
          });
          return;
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
  promptCheckOut(): void {
    if (this.isDesktopBlockedForAttendance()) {
      this.toastService.error(
        'Mobile Device Required',
        'Check-in and check-out are only allowed from a mobile device. Desktop, laptop, and tablet devices are not permitted.'
      );
      return;
    }
    const attendanceId = this.checkInService.getAttendanceId();
    if (!attendanceId) {
      this.toastService.error('Checkout Failed', 'No active attendance record found for today.');
      return;
    }
    this.showCheckOutModal.set(true);
  }

  cancelCheckOut(): void {
    if (this.isCheckingOut()) return;
    this.showCheckOutModal.set(false);
  }

  async confirmCheckOut(): Promise<void> {
    if (this.isCheckingOut()) return;
    if ((this.isWfhRequired() || this.isWfhMode()) && !this.wfhPasscode().trim()) {
      this.toastService.error('Passcode Required', 'Please enter your 6-character WFH passcode provided by your Team Leader.');
      return;
    }
    this.isCheckingOut.set(true);
    await this.onCheckOut();
  }

  async onCheckOut(): Promise<void> {
    if (this.isDesktopBlockedForAttendance()) {
      this.toastService.error(
        'Mobile Device Required',
        'Check-in and check-out are only allowed from a mobile device. Desktop, laptop, and tablet devices are not permitted.'
      );
      return;
    }
    const attendanceId = this.checkInService.getAttendanceId();
    if (!attendanceId) {
      this.toastService.error('Checkout Failed', 'No active attendance record found for today.');
      return;
    }

    if ((this.isWfhRequired() || this.isWfhMode()) && !this.wfhPasscode().trim()) {
      this.toastService.error('Passcode Required', 'Please enter your 6-character WFH passcode provided by your Team Leader.');
      this.isCheckingOut.set(false);
      return;
    }

    let coords: LocationCoordinates | null = null;
    try {
      coords = await this.checkInService.getCurrentLocation();
    } catch (_) {
      // Desktop devices may not support Geolocation API; proceed with available network context
    }

    const passcode = this.wfhPasscode().trim().toUpperCase();
    const payload: AttendanceCheckOutPayload = {
      attendance_id: attendanceId,
      latitude: coords ? coords.latitude : undefined,
      longitude: coords ? coords.longitude : undefined,
      ip_address: this.clientIp(),
      deviceid: this.checkInService.getDeviceId() || undefined,
      override_code: passcode || undefined
    };

    this.checkOutService.getData(payload).subscribe({
      next: () => {
        this.isCheckingOut.set(false);
        this.showCheckOutModal.set(false);
        this.isWfhRequired.set(false);
        this.isWfhMode.set(false);
        this.wfhPasscode.set('');
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        this.checkOutTime.set(timeStr);
        this.checkInService.clearAttendanceMarked();
        this.statusState.set('COMPLETED');
        this.toastService.info('Check-Out Recorded', `Check-out recorded at ${timeStr}. Session completed.`);
        setTimeout(() => {
          this.authService.forceSessionLogout('session_transferred');
          this.router.navigate(['/login']);
        }, 1200);
      },
      error: (err: any) => {
        this.isCheckingOut.set(false);
        this.showCheckOutModal.set(false);
        let errorMsg = 'Failed to record checkout on the server.';
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

          if (
            errorMsg.includes('Device mismatch') ||
            errorMsg.includes('DEV-') ||
            errorMsg.includes('Expected check-in device') ||
            errorMsg.includes('device_id')
          ) {
            errorMsg = 'Device mismatch: Check-out must be performed from your primary logged-in mobile device used during check-in.';
          }

          if (
            err?.status === 401 ||
            err?.status === 403 ||
            errorMsg.includes('Invalid token') ||
            errorMsg.includes('Authentication credentials were not provided')
          ) {
            this.authService.forceSessionLogout('session_transferred');
            this.router.navigate(['/login'], {
              queryParams: { sessionTransferred: 'true' },
              replaceUrl: true
            });
            return;
          }

          if (errorMsg.includes('IP Mismatch') || errorMsg.includes('Geofence')) {
            this.isWfhRequired.set(true);
            this.toastService.error('Off-site Location Detected', 'You are not within the authorized network/location. Please request a WFH passcode to checkout.');
          } else {
            this.toastService.error('Checkout Failed', errorMsg);
          }
        }
      });
  }

  onCancelWfhCheckout(): void {
    this.isWfhRequired.set(false);
    this.isWfhMode.set(false);
    this.wfhPasscode.set('');
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
      case 'MANAGER': return 'badge-manager';
      case 'TL': return 'badge-tl';
      case 'TC': return 'badge-tc';
      default: return '';
    }
  }
}
