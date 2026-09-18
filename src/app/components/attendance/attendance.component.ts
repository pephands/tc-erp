import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
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

  get isAdminOrManager(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('MANAGER');
  }

  get isTlUser(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('TL') && !this.isAdminOrManager;
  }

  get isTcUser(): boolean {
    return !this.isAdminOrManager && !this.isTlUser;
  }

  get userBranchName(): string {
    return this.authService.currentUser()?.branch?.name || '';
  }

  // Filter selections
  selectedBranch = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  isFilterApplied = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);

  // Toast feedback state
  refreshToastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  // Modal State
  isDetailModalOpen = signal<boolean>(false);
  selectedAttendance = signal<AttendanceRecord | null>(null);

  // Search & Pagination state
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);

  // Master data for filters
  branches = signal<any[]>([]);

  constructor() {
    this.branchService.getData().subscribe({
      next: (res: any) => {
        if (res.status === 'success' || (Array.isArray(res) || res.data)) {
          const data = Array.isArray(res) ? res : (res.data || []);
          this.branches.set(data);
        }
      }
    });
  }

  ngOnInit(): void {
    if (this.isTlUser && this.userBranchName) {
      this.selectedBranch.set(this.userBranchName);
    }
    this.fetchAttendanceFromApi();
  }

  fetchAttendanceFromApi(isManualRefresh: boolean = false): void {
    this.isLoading.set(true);
    const branch = this.isTlUser ? (this.userBranchName || this.selectedBranch()) : (this.isAdminOrManager ? this.selectedBranch() : '');
    const start = this.startDate();
    const end = this.endDate();
    const search = this.searchQuery().trim();


    this.attendanceService.getAttendanceRecords(branch, start, end, search, this.currentPage(), this.pageSize()).subscribe({
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
    const tcId = user.username || (user.id ? String(user.id) : (item.user ? String(item.user) : ''));
    const tcName = user.full_name || user.username || '';
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

    this.attendanceService.exportAttendanceExcel(branch, start, end, search).subscribe({
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

  private updateFilterAppliedState(): void {
    const isBranchFiltered = this.isAdminOrManager ? !!this.selectedBranch() : false;
    this.isFilterApplied.set(!!(isBranchFiltered || this.startDate() || this.endDate() || this.searchQuery()));
  }

  onResetFilters(): void {
    this.selectedBranch.set(this.isTlUser ? this.userBranchName : '');
    this.startDate.set('');
    this.endDate.set('');
    this.searchQuery.set('');
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
}
