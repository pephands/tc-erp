import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { OnlinePaymentRecord } from '../../models/payment.model';

@Component({
  selector: 'app-online-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './online-history.component.html',
  styleUrl: './online-history.component.css'
})
export class OnlineHistoryComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private branchService = inject(BranchListService);
  private authService = inject(AuthService);

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  statusFilter = signal<string>('');
  branchFilter = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Auth & Roles
  isAdmin = signal<boolean>(false);
  isManager = signal<boolean>(false);
  branches = signal<any[]>([]);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  ngOnInit(): void {
    this.checkUserRole();
    this.fetchApprovedRecords();
  }

  checkUserRole(): void {
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
    this.isManager.set(this.authService.hasRole(['MANAGER']));

    if (this.isAdmin() || this.isManager()) {
      this.fetchBranches();
    }
  }

  fetchBranches(): void {
    this.branchService.getData(1, 100).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.branches.set(res.results);
        } else if (res && res.data) {
          this.branches.set(res.data);
        } else if (Array.isArray(res)) {
          this.branches.set(res);
        }
      },
      error: (err: any) => {
        console.error('Error fetching branches:', err);
      }
    });
  }

  fetchApprovedRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();

    const status = this.statusFilter();
    const branch = this.branchFilter();

    this.paymentService.getRecords(status, search, start, end, page, '', false, branch).subscribe({
      next: (res: any) => {
        let items: OnlinePaymentRecord[] = [];
        let count = 0;

        if (res && res.results) {
          items = res.results;
          count = res.count || items.length;
        } else if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
          count = items.length;
        } else if (Array.isArray(res)) {
          items = res;
          count = items.length;
        }

        this.records.set(items);
        this.totalCount.set(count);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching approved payment records:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Filter Handlers
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onStatusChange(val: string): void {
    this.statusFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onBranchChange(val: string): void {
    this.branchFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.statusFilter.set('');
    this.branchFilter.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || this.startDate() || this.endDate() || this.statusFilter() || this.branchFilter()));
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchApprovedRecords();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchApprovedRecords();
    }
  }
}
