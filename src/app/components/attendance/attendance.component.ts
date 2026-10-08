import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { UserListService } from '../../services/user-list.service';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord } from '../../models/attendance.model';
import { AttendanceDetailModalComponent } from '../modals/attendance-detail-modal/attendance-detail-modal.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceDetailModalComponent],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent implements OnInit {
  private branchService = inject(BranchListService);
  private attendanceService = inject(AttendanceService);
  private authService = inject(AuthService);
  private userListService = inject(UserListService);

  get isAdmin(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN');
  }

  get isAdminOrManager(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('MANAGER');
  }

  get isTlUser(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('TL') && !this.isAdminOrManager;
  }

  get isTcUser(): boolean {
    return !this.isAdminOrManager && !this.isTlUser && !this.isSuperintendent;
  }

  get userBranchName(): string {
    return this.authService.currentUser()?.branch?.name || '';
  }

  get isSuperintendent(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('SUPERINTENDENT') && !roles.includes('ADMIN') && !roles.includes('MANAGER');
  }

  // Filter selections
  selectedBranch = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedStatus = signal<string>('');
  isFilterApplied = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);

  // Toast feedback state
  refreshToastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  // Modal State
  isDetailModalOpen = signal<boolean>(false);
  selectedAttendance = signal<AttendanceRecord | null>(null);

  isManualMarkModalOpen = signal<boolean>(false);
  isSubmittingManual = signal<boolean>(false);
  trustUsers = signal<any[]>([]);
  
  activeTab = signal<'checkin' | 'checkout'>('checkin');

  manualForm = {
    userIds: [] as string[],
    date: new Date().toLocaleDateString('en-CA'),
    status: 'P',
    inTime: '',
    outTime: '',
    location: '',
    ip_address: ''
  };

  modalTodayAttendance = signal<AttendanceRecord[]>([]);

  get todayAttendanceMap(): Record<string, AttendanceRecord> {
    const map: Record<string, AttendanceRecord> = {};
    for (const rec of this.modalTodayAttendance()) {
      map[rec.tcId] = rec;
    }
    return map;
  }

  get checkInUsers(): any[] {
    // Users who don't have a "Present" record today
    return this.trustUsers().filter(u => {
      const rec = this.todayAttendanceMap[String(u.employee_Id)];
      return !rec || rec.status !== 'Present';
    });
  }

  get checkOutUsers(): any[] {
    // Users who have a "Present" record today, and maybe don't have outTime yet
    return this.trustUsers().filter(u => {
      const rec = this.todayAttendanceMap[String(u.employee_Id)];
      return rec && rec.status === 'Present';
    });
  }

  get currentTabUsers(): any[] {
    return this.activeTab() === 'checkin' ? this.checkInUsers : this.checkOutUsers;
  }

  toggleManualUser(userId: any): void {
    const strId = String(userId);
    const idx = this.manualForm.userIds.indexOf(strId);
    if (idx > -1) {
      this.manualForm.userIds.splice(idx, 1);
    } else {
      this.manualForm.userIds.push(strId);
    }
  }

  isUserSelected(userId: any): boolean {
    return this.manualForm.userIds.includes(String(userId));
  }

  selectAllUsers(select: boolean): void {
    if (select) {
      this.manualForm.userIds = this.currentTabUsers.map(u => String(u.id));
    } else {
      this.manualForm.userIds = [];
    }
  }

  // Search & Pagination state
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);

  // Master data for filters
  branches = signal<any[]>([]);

  constructor() {
    this.branchService.getData(1, 1000).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || (Array.isArray(res) || res.data)) {
          const data = Array.isArray(res) ? res : (res.data || []);
          this.branches.set(data.filter((b: any) => !b.is_trust));
        }
      }
    });
  }

  get currentMonthStart(): string {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1, 12).toISOString().split('T')[0];
  }

  get currentMonthEnd(): string {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0, 12).toISOString().split('T')[0];
  }

  ngOnInit(): void {
    if (this.isTlUser && this.userBranchName) {
      this.selectedBranch.set(this.userBranchName);
    }
    if (this.isTcUser) {
      this.startDate.set(this.currentMonthStart);
      this.endDate.set(this.currentMonthEnd);
    }
    this.fetchAttendanceFromApi();
  }

  fetchAttendanceFromApi(isManualRefresh: boolean = false): void {
    this.isLoading.set(true);
    const branch = this.isTlUser ? (this.userBranchName || this.selectedBranch()) : (this.isAdminOrManager ? this.selectedBranch() : '');
    
    let start = this.startDate();
    let end = this.endDate();

    if (this.isTcUser) {
      // Force restriction to current month if dates are out of bounds or missing
      const minDate = this.currentMonthStart;
      const maxDate = this.currentMonthEnd;
      
      if (!start || start < minDate) start = minDate;
      if (start > maxDate) start = maxDate;
      
      if (!end || end > maxDate) end = maxDate;
      if (end < minDate) end = minDate;
    }

    const search = this.searchQuery().trim();
    const status = this.selectedStatus();


    this.attendanceService.getAttendanceRecords(branch, start, end, search, this.currentPage(), this.pageSize(), status).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
          if (res.count !== undefined) {
             this.totalItems.set(res.count);
          } else {
             this.totalItems.set(items.length);
          }
        } else if (Array.isArray(res)) {
          items = res;
          this.totalItems.set(items.length);
        }

        const mappedRecords: AttendanceRecord[] = items.map((item: any) => this.mapApiToAttendanceRecord(item));
        this.attendanceService.attendanceRecords.set(mappedRecords);
        this.isLoading.set(false);

        if (isManualRefresh) {
          this.triggerToast(`Attendance refreshed! ${mappedRecords.length} record(s) loaded.`);
        }
      },
      error: (err: any) => {
        console.error('Error fetching attendance records:', err);
        this.isLoading.set(false);
        if (isManualRefresh) {
          this.triggerToast('Failed to refresh attendance records.');
        }
      }
    });
  }

  triggerToast(msg: string): void {
    this.refreshToastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3500);
  }

  private formatTime(timeStr: string): string {
    if (!timeStr) return '-- : --';
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const mins = parts[1];
      if (isNaN(hours)) return timeStr;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${mins} ${ampm}`;
    }
    return timeStr;
  }

  private mapApiToAttendanceRecord(item: any): AttendanceRecord {
    const user = item.user_details || {};
    const tcId = user.employee_Id || (user.id ? String(user.id) : (item.user ? String(item.user) : ''));
    const tcName = user.full_name || user.employee_Id || '';
    const tcDetails = tcId && tcName ? `${tcId}-${tcName}` : (tcName || tcId || 'N/A');
    const branchName = item.branch_name || user.branch_name || 'N/A';

    let status: 'Present' | 'Absent' | 'WFH' | string = item.status_display || item.status;
    if (item.is_wfh || status === 'WFH') {
      status = 'WFH';
    } else if (status === 'P' || status === 'Present') {
      status = 'Present';
    } else if (status === 'A' || status === 'Absent') {
      status = 'Absent';
    }

    return {
      id: String(item.id),
      branchName,
      tcId,
      tcName,
      tcDetails,
      attendanceDate: item.date || item.attendance_date || '',
      status,
      inTime: this.formatTime(item.in_time),
      outTime: this.formatTime(item.out_time),
      allowMultipleSessions: !!item.allow_multiple_sessions,
      originalItem: item, // attach original raw item
    };
  }

  // Attendance Records from service
  allAttendance = this.attendanceService.attendanceRecords;

  // Filtered Attendance List (Replaced with backend total count)
  filteredAttendanceLength = computed(() => this.totalItems());

  // Total pages
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  // Paginated attendance list (now directly from backend)
  paginatedAttendance = computed(() => this.allAttendance());

  // Page Numbers Array
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= Math.min(this.totalPages(), 6); i++) {
      pages.push(i);
    }
    return pages;
  });

  // Top Action Handlers
  onRefreshAttendance(): void {
    this.fetchAttendanceFromApi(true);
  }

  onDownloadAttendanceData(): void {
    this.isExporting.set(true);
    const branch = this.isTlUser ? (this.userBranchName || this.selectedBranch()) : (this.isAdminOrManager ? this.selectedBranch() : '');
    const start = this.startDate();
    const end = this.endDate();
    const search = this.searchQuery().trim();
    const status = this.selectedStatus();

    this.attendanceService.exportAttendanceExcel(branch, start, end, search, status).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.triggerToast('Attendance report Excel file downloaded successfully.');
      },
      error: (err: any) => {
        console.error('Error downloading attendance report:', err);
        this.isExporting.set(false);
        alert('Failed to download attendance report. Please try again.');
      }
    });
  }

  onBranchChange(val: string): void {
    this.selectedBranch.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchAttendanceFromApi();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchAttendanceFromApi();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchAttendanceFromApi();
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchAttendanceFromApi();
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchAttendanceFromApi();
  }

  private updateFilterAppliedState(): void {
    const isBranchFiltered = this.isAdminOrManager ? !!this.selectedBranch() : false;
    this.isFilterApplied.set(!!(isBranchFiltered || this.startDate() || this.endDate() || this.searchQuery() || this.selectedStatus()));
  }

  onResetFilters(): void {
    this.selectedBranch.set(this.isTlUser ? this.userBranchName : '');
    this.startDate.set('');
    this.endDate.set('');
    this.searchQuery.set('');
    this.selectedStatus.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchAttendanceFromApi();
  }

  // Modal Handlers
  openDetailModal(item: AttendanceRecord): void {
    this.selectedAttendance.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedAttendance.set(null);
  }

  toggleMultipleSessions(item: AttendanceRecord): void {
    if (!item.id) return;
    this.attendanceService.toggleMultipleSessions(item.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.triggerToast(res.message || 'Multiple sessions updated.');
          item.allowMultipleSessions = res.allow_multiple_sessions;
          item.originalItem.allow_multiple_sessions = res.allow_multiple_sessions;
        } else {
          alert(res.message || 'Failed to update multiple sessions.');
        }
      },
      error: (err: any) => {
        alert(err.error?.message || 'Error updating multiple sessions.');
      }
    });
  }


  // Pagination Handlers
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchAttendanceFromApi();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchAttendanceFromApi();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchAttendanceFromApi();
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPages());
    this.fetchAttendanceFromApi();
  }

  showTemporaryToast(message: string): void {
    this.refreshToastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  openManualMarkModal(): void {
    this.isManualMarkModalOpen.set(true);
    this.activeTab.set('checkin');
    
    // Fetch location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.manualForm.location = `${pos.coords.latitude},${pos.coords.longitude}`;
        },
        err => console.error(err)
      );
    }
    
    // Fetch IP dummy or actual if possible
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => this.manualForm.ip_address = data.ip)
      .catch(err => console.error(err));

    // Reset form
    const todayStr = new Date().toLocaleDateString('en-CA');
    this.manualForm = {
      userIds: [],
      date: todayStr,
      status: 'P',
      inTime: '',
      outTime: '',
      location: this.manualForm.location,
      ip_address: this.manualForm.ip_address
    };

    // Fetch today's attendance specifically for the modal to avoid pagination issues
    this.attendanceService.getAttendanceRecords(this.userBranchName || this.selectedBranch(), todayStr, todayStr, '', 1, 500).subscribe({
      next: (res: any) => {
        const records = Array.isArray(res) ? res : (res.data || res.results || []);
        const mappedRecords: AttendanceRecord[] = records.map((r: any) => this.mapApiToAttendanceRecord(r));
        this.modalTodayAttendance.set(mappedRecords);
      }
    });

    // Fetch trust users for the branch
    this.userListService.getRoleUsers('TRUST_USERS', this.userBranchName, null, null, 1, 500).subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          this.trustUsers.set(res.data.results || res.data);
        } else if (res.results) {
          this.trustUsers.set(res.results);
        }
      }
    });
  }

  closeManualMarkModal(): void {
    this.isManualMarkModalOpen.set(false);
  }

  submitManualAttendance(action: string): void {
    if (this.manualForm.userIds.length === 0) {
      alert("Please select at least one user.");
      return;
    }
    
    if (action === 'checkin' && !this.manualForm.inTime) {
      alert("Please enter In Time.");
      return;
    }
    if (action === 'checkout' && !this.manualForm.outTime) {
      alert("Please enter Out Time.");
      return;
    }

    this.isSubmittingManual.set(true);
    const payload = {
      user_ids: this.manualForm.userIds,
      date: this.manualForm.date,
      status: action === 'checkin' ? 'P' : null,
      in_time: this.manualForm.inTime || null,
      out_time: this.manualForm.outTime || null,
      action: action,
      location: this.manualForm.location || 'Manual Override',
      ip_address: this.manualForm.ip_address || '127.0.0.1'
    };

    this.attendanceService.markManualAttendance(payload).subscribe({
      next: (res: any) => {
        this.isSubmittingManual.set(false);
        this.closeManualMarkModal();
        this.showTemporaryToast(res.message || 'Attendance updated successfully.');
        this.fetchAttendanceFromApi();
      },
      error: (err: any) => {
        this.isSubmittingManual.set(false);
        alert(err.error?.message || 'Error marking attendance.');
      }
    });
  }
}
