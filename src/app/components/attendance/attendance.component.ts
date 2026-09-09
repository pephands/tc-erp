import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
import { AttendanceRecord } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent implements OnInit {
  private branchService = inject(BranchListService);
  private attendanceService = inject(AttendanceService);
  private authService = inject(AuthService);

  get isTlUser(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('TL') && !roles.includes('ADMIN') && !roles.includes('MANAGER');
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

  // Search & Pagination state
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

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
    const branch = this.isTlUser ? (this.userBranchName || this.selectedBranch()) : this.selectedBranch();
    const start = this.startDate();
    const end = this.endDate();
    const search = this.searchQuery().trim();


    this.attendanceService.getAttendanceRecords(branch, start, end, search).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
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
      inTime: item.in_time || '',
      outTime: item.out_time || '',
    };
  }

  // Attendance Records from service
  allAttendance = this.attendanceService.attendanceRecords;

  // Filtered Attendance List (Client-side search refinement)
  filteredAttendance = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    return this.allAttendance().filter(item => {
      if (query) {
        const fullSearchStr = `${item.branchName} ${item.tcDetails} ${item.tcId} ${item.tcName} ${item.status} ${item.attendanceDate}`.toLowerCase();
        if (!fullSearchStr.includes(query)) {
          return false;
        }
      }
      return true;
    });
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.filteredAttendance().length / this.pageSize()) || 1);

  // Paginated attendance list
  paginatedAttendance = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredAttendance().slice(start, start + this.pageSize());
  });

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
    const branch = this.isTlUser ? (this.userBranchName || this.selectedBranch()) : this.selectedBranch();
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
    const isBranchFiltered = this.isTlUser ? false : !!this.selectedBranch();
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


  // Pagination Handlers
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPages());
  }
}
