import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PaymentService } from '../../../services/payment.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { BranchListService } from '../../../services/branch-list.service';
import { AddOnlinePaymentModalComponent } from '../../../modals/add-online-payment-modal/add-online-payment-modal.component';

@Component({
  selector: 'app-batch-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, AddOnlinePaymentModalComponent],
  templateUrl: './batch-receipts.component.html',
  styleUrl: './batch-receipts.component.css',
})
export class BatchReceiptsComponent implements OnInit, OnDestroy {
  paymentService = inject(PaymentService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  branchService = inject(BranchListService);

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Branches state
  branches = signal<any[]>([]);
  selectedBranch = signal<string>('');

  // Batches state
  batchRuns = signal<any[]>([]);
  selectedBatchId = signal<string>('');
  isLoadingBatches = signal<boolean>(false);

  // Records state
  records = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  totalRecords = signal<number>(0);
  totalPendingCount = signal<number>(0);

  // Filters
  searchQuery = signal<string>('');
  donorTypeFilter = signal<string>(''); // '' (All), 'NEW', 'OLD'
  selectedBatchDate = signal<string>(''); // particular date batch was generated
  whatsappFilter = signal<string>('false'); // default is false: only un-sent
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = signal<number>(1);
  pageNumbers = computed(() => {
    const pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage() - 2);
    let end = Math.min(this.totalPages(), start + maxPages - 1);
    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  // Action states
  sendingWhatsApp = signal<Set<number>>(new Set());

  totalBatchCount = computed(() => {
    return this.selectedBatchDate() ? this.batchRuns().length : 0;
  });

  ngOnInit(): void {
    this.loadBranches();
    // Default: list overall batch records where status == 'OK' and WhatsApp receipt unsent
    // Do NOT fetch all historical runs on page load
    this.fetchRecords();

    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query: string) => {
        const trimmed = query.trim();
        // Automatically fetch from backend when >= 3 characters typed, or when cleared
        if (trimmed.length >= 3 || trimmed.length === 0) {
          this.currentPage.set(1);
          this.fetchRecords();
        }
      });
  }

  loadBranches(): void {
    this.branchService.getData(1, 100).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success' && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
          this.branches.set(list.filter((b: any) => !b.is_trust));
        } else if (res && res.results) {
          this.branches.set(res.results.filter((b: any) => !b.is_trust));
        } else if (res && res.data) {
          this.branches.set(res.data.filter((b: any) => !b.is_trust));
        } else if (Array.isArray(res)) {
          this.branches.set(res.filter((b: any) => !b.is_trust));
        }
      },
      error: (err: any) => {
        console.error('Error fetching branches for batch receipts:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onBranchChange(branchId: string): void {
    this.selectedBranch.set(branchId || '');
    this.currentPage.set(1);
    if (this.selectedBatchDate()) {
      this.fetchBatchRunsForDate(this.selectedBatchDate());
    }
    this.fetchRecords();
  }

  onDonorTypeChange(type: string): void {
    this.donorTypeFilter.set(type || '');
    this.currentPage.set(1);
    if (this.selectedBatchDate()) {
      this.fetchBatchRunsForDate(this.selectedBatchDate());
    }
    this.fetchRecords();
  }

  fetchBatchRunsForDate(batchDate: string): void {
    if (!batchDate) {
      this.batchRuns.set([]);
      return;
    }
    this.isLoadingBatches.set(true);
    this.paymentService.getBatchReceiptRuns(batchDate, this.selectedBranch(), this.donorTypeFilter()).subscribe({
      next: (res: any) => {
        this.isLoadingBatches.set(false);
        if (res && res.data) {
          this.batchRuns.set(res.data);
        } else {
          this.batchRuns.set([]);
        }
      },
      error: () => {
        this.isLoadingBatches.set(false);
        this.batchRuns.set([]);
      },
    });
  }

  fetchRecords(): void {
    this.isLoading.set(true);
    this.paymentService
      .getBatchReceipts(
        this.currentPage(),
        this.selectedBatchId(),
        this.searchQuery().trim(),
        this.whatsappFilter(),
        this.pageSize(),
        this.startDate(),
        this.endDate(),
        this.selectedBatchDate(),
        this.selectedBranch(),
        this.donorTypeFilter()
      )
      .subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          if (res) {
            const results = res.results || res.data || [];
            this.records.set(results);
            const total = res.count ?? results.length;
            this.totalRecords.set(total);
            if (res.total_pending !== undefined) {
              this.totalPendingCount.set(res.total_pending);
            } else if (this.whatsappFilter() === 'false') {
              this.totalPendingCount.set(total);
            }
            this.totalPages.set(Math.ceil(total / this.pageSize()) || 1);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg = err.error?.message || err.error?.error || 'Failed to load batch receipt records.';
          this.toastService.error('Error', msg);
        },
      });
  }

  onBatchDateChange(dateVal: string): void {
    this.selectedBatchDate.set(dateVal || '');
    this.selectedBatchId.set(''); // reset batch selection
    this.currentPage.set(1);

    if (dateVal) {
      // Query ONLY the batches generated on this date
      this.fetchBatchRunsForDate(dateVal);
    } else {
      this.batchRuns.set([]);
    }

    this.fetchRecords();
  }

  onBatchChange(batchId: string): void {
    this.selectedBatchId.set(batchId);
    this.currentPage.set(1);
    this.fetchRecords();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.fetchRecords();
  }

  onSearchSubmit(): void {
    this.currentPage.set(1);
    this.fetchRecords();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedBranch.set('');
    this.donorTypeFilter.set('');
    this.selectedBatchDate.set('');
    this.selectedBatchId.set('');
    this.batchRuns.set([]);
    this.whatsappFilter.set('false');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
    this.fetchRecords();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchRecords();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.fetchRecords();
  }

  hasReceiptId(record: any): boolean {
    if (!record || !record.receipt_id) return false;
    const val = String(record.receipt_id).trim();
    return val.length > 0 && val !== '-';
  }

  // Row Action Handlers
  onView(record: any): void {
    if (!this.hasReceiptId(record)) {
      this.toastService.error('Missing Receipt ID', 'Receipt ID is not available for this record.');
      return;
    }
    if (record.generated_receipt_url) {
      const sep = record.generated_receipt_url.includes('?') ? '&' : '?';
      const freshUrl = `${record.generated_receipt_url}${sep}t=${Date.now()}`;
      window.open(freshUrl, '_blank');
      return;
    }
    if (record.id) {
      this.toastService.info('Generating', 'Loading receipt preview...');
      this.paymentService.downloadReceipt(record.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          this.fetchRecords();
        },
        error: (err: HttpErrorResponse) => {
          const msg = err.error?.message || 'Failed to preview receipt.';
          this.toastService.error('View Failed', msg);
        },
      });
    }
  }

  onDownload(record: any): void {
    if (!this.hasReceiptId(record)) {
      this.toastService.error('Missing Receipt ID', 'Receipt ID is not available for this record.');
      return;
    }
    if (record.generated_receipt_url) {
      const sep = record.generated_receipt_url.includes('?') ? '&' : '?';
      const freshUrl = `${record.generated_receipt_url}${sep}t=${Date.now()}`;
      const a = document.createElement('a');
      a.href = freshUrl;
      a.target = '_blank';
      a.download = `Receipt_${record.receipt_id || record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (record.id) {
      this.toastService.info('Generating', 'Preparing receipt download...');
      this.paymentService.downloadReceipt(record.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Receipt_${record.receipt_id || record.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.fetchRecords();
        },
        error: (err: HttpErrorResponse) => {
          const msg = err.error?.message || 'Failed to download receipt.';
          this.toastService.error('Download Failed', msg);
        },
      });
    }
  }

  // Edit modal state
  showEditModal = signal<boolean>(false);
  editRecord = signal<any>(null);

  onEdit(record: any): void {
    this.editRecord.set(record);
    this.showEditModal.set(true);
  }

  onModalClose(): void {
    this.showEditModal.set(false);
    this.editRecord.set(null);
  }

  onModalSubmit(): void {
    this.showEditModal.set(false);
    this.editRecord.set(null);
    this.toastService.success(
      'Receipt Updated',
      'Receipt has been updated with a new receipt PDF. Marked as pending for WhatsApp.'
    );
    this.fetchRecords();
    if (this.selectedBatchDate()) {
      this.fetchBatchRunsForDate(this.selectedBatchDate());
    }
  }

  onSendWhatsApp(record: any): void {
    if (!record.id || !this.hasReceiptId(record)) {
      this.toastService.error('Missing Receipt ID', 'Receipt ID is required to send WhatsApp receipt.');
      return;
    }
    this.sendingWhatsApp.update((s) => new Set(s).add(record.id));
    this.paymentService.sendWhatsappReceipt(record.id).subscribe({
      next: () => {
        this.sendingWhatsApp.update((s) => {
          const next = new Set(s);
          next.delete(record.id);
          return next;
        });
        this.toastService.success(
          'WhatsApp Receipt Sent',
          `Receipt sent to ${record.donor_name} (${record.mobile_number}). Record updated!`
        );
        // Refresh records and batch counts - this record will automatically vanish from pending list!
        this.fetchRecords();
        if (this.selectedBatchDate()) {
          this.fetchBatchRunsForDate(this.selectedBatchDate());
        }
      },
      error: (err: HttpErrorResponse) => {
        this.sendingWhatsApp.update((s) => {
          const next = new Set(s);
          next.delete(record.id);
          return next;
        });
        const msg = err.error?.error || err.error?.message || 'Failed to send WhatsApp receipt.';
        this.toastService.error('Send Failed', msg);
      },
    });
  }
}
