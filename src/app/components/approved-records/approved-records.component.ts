import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { BranchListService } from '../../services/branch-list.service';
import { OnlinePaymentRecord } from '../../models/payment.model';

@Component({
  selector: 'app-approved-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approved-records.component.html',
  styleUrl: './approved-records.component.css'
})
export class ApprovedRecordsComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private branchService = inject(BranchListService);

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);

  // Role
  userRole = signal<string>('');

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  branchFilter = signal<string>('');
  branches = signal<any[]>([]);
  isFilterApplied = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  pageNumbers = computed(() => {
    const pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage() - 2);
    let end = Math.min(this.totalPages(), start + maxPages - 1);
    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  ngOnInit(): void {
    const roles = this.authService.userRoles();
    let role = '';
    if (roles.includes('ADMIN')) role = 'ADMIN';
    else if (roles.includes('MANAGER')) role = 'MANAGER';
    else if (roles.includes('TL')) role = 'TL';
    else if (roles.includes('TC')) role = 'TC';

    this.userRole.set(role);
    if (role === 'TC') {
      const today = new Date();
      const endStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      this.startDate.set(startStr);
      this.endDate.set(endStr);
    }
    this.fetchBranches();
    this.fetchApprovedRecords();
  }

  fetchBranches(): void {
    // Only fetch non-trust branches (is_trust=false)
    this.branchService.getData(1, 1000, '', 'true', 'false').subscribe({
      next: (res: any) => {
        let branchList: any[] = [];
        if (res && res.data) {
          branchList = res.data;
        } else if (res && res.results) {
          branchList = res.results;
        } else if (Array.isArray(res)) {
          branchList = res;
        }
        // Strict guard: ensure only branches with is_trust == false are included
        branchList = branchList.filter((b: any) => !b.is_trust);

        // For TL role, strictly show only their assigned branch if applicable
        if (this.userRole() === 'TL') {
          const userBranchId = this.authService.currentUser()?.branch?.id;
          if (userBranchId) {
            branchList = branchList.filter((b: any) => b.id === userBranchId);
            this.branchFilter.set(String(userBranchId));
          }
        }

        this.branches.set(branchList);
      },
      error: (err: any) => {
        console.error('Error fetching branches for approved records:', err);
      }
    });
  }

  fetchApprovedRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();
    const branch = this.branchFilter();

    this.paymentService.getRecords(
      'OK',
      search,
      start,
      end,
      page,
      '',
      false,
      branch,
      false,
      '',
      '',
      this.pageSize(),
      '',
      'false' // Exclude trust branches (only branch is_trust == false)
    ).subscribe({
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

        // Additional safeguard to ensure no trust branch records are shown
        items = items.filter((rec: any) => !rec.branch_is_trust);

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

  onBranchChange(val: string): void {
    this.branchFilter.set(val);
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

  onResetFilters(): void {
    this.searchQuery.set('');
    
    if (this.userRole() === 'TL') {
      const userBranchId = this.authService.currentUser()?.branch?.id;
      this.branchFilter.set(userBranchId ? String(userBranchId) : '');
    } else {
      this.branchFilter.set('');
    }
    
    if (this.userRole() === 'TC') {
      const today = new Date();
      const endStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      this.startDate.set(startStr);
      this.endDate.set(endStr);
    } else {
      this.startDate.set('');
      this.endDate.set('');
    }
    
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || this.startDate() || this.endDate() || this.branchFilter()));
  }

  downloadReceipt(rec: OnlinePaymentRecord): void {
    this.paymentService.downloadReceipt(rec.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${rec.receipt_id || rec.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Error downloading receipt PDF:', err);
      },
    });
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchApprovedRecords();
    }
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
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
