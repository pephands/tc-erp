import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
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

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);

  // Role
  userRole = signal<string>('');

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
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
      const today = new Date().toISOString().slice(0, 10);
      this.startDate.set(today);
      this.endDate.set(today);
    }
    this.fetchApprovedRecords();
  }

  fetchApprovedRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();

    this.paymentService.getRecords('OK', search, start, end, page).subscribe({
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

  onResetFilters(): void {
    this.searchQuery.set('');
    
    if (this.userRole() === 'TC') {
      const today = new Date().toISOString().slice(0, 10);
      this.startDate.set(today);
      this.endDate.set(today);
    } else {
      this.startDate.set('');
      this.endDate.set('');
    }
    
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || this.startDate() || this.endDate()));
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

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchApprovedRecords();
    }
  }
}
