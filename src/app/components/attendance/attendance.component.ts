import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchService } from '../../services/branch.service';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceRecord } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent {
  private branchService = inject(BranchService);
  private attendanceService = inject(AttendanceService);

  // Filter selections
  selectedBranch = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Search & Pagination state
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Branch options from service
  branches = computed(() => this.branchService.branches());

  // Attendance Records from service
  allAttendance = this.attendanceService.attendanceRecords;

  // Filtered Attendance List
  filteredAttendance = computed(() => {
    const branchFilter = this.selectedBranch().trim().toUpperCase();
    const query = this.searchQuery().trim().toLowerCase();
    const start = this.startDate();
    const end = this.endDate();

    return this.allAttendance().filter(item => {
      // 1. Branch Filter
      if (branchFilter && !item.branchName.toUpperCase().includes(branchFilter)) {
        return false;
      }
      // 2. Date Range Filter
      if (start && item.attendanceDate < start) {
        return false;
      }
      if (end && item.attendanceDate > end) {
        return false;
      }
      // 3. Search Query (Branch, TC Details, ID, Name, Status)
      if (query) {
        const fullSearchStr = `${item.branchName} ${item.tcDetails} ${item.tcId} ${item.tcName} ${item.status}`.toLowerCase();
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

  // Page Numbers Array (1, 2, 3, 4, 5, 6...)
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= Math.min(this.totalPages(), 6); i++) {
      pages.push(i);
    }
    return pages;
  });

  // Top Action Handlers
  onRefreshAttendance(): void {
    this.attendanceService.refreshAttendance();
    alert('Attendance records refreshed successfully!');
  }

  onDownloadAttendanceData(): void {
    alert('Exporting Attendance Data to Excel...');
  }

  onApplyFilters(): void {
    if (!this.selectedBranch() && !this.startDate() && !this.endDate()) {
      alert('Please select a Branch or Date Range before applying filters.');
      return;
    }
    this.isFilterApplied.set(true);
    this.currentPage.set(1);
  }

  onResetFilters(): void {
    this.selectedBranch.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.searchQuery.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
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
