import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-unclaimed-records',
  templateUrl: './unclaimed-records.component.html',
  styleUrl: './unclaimed-records.component.css',
})
export class UnclaimedRecordsComponent implements OnInit, OnDestroy {
  paymentService = inject(PaymentService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // State signals
  records = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  isExporting = signal<boolean>(false);

  // Actions state
  sendingWhatsApp = signal<Set<number>>(new Set());

  isOT = computed(() => {
    return this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM']) && !this.authService.hasRole(['ADMIN']);
  });

  // Stats / Metrics
  totalRecords = signal<number>(0);
  totalAmount = computed(() => {
    return this.records().reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  });

  // Search & Filter
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');

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

  // Upload feedback modal/details
  uploadSuccessMessage = signal<string>('');
  uploadErrors = signal<string[]>([]);
  showUploadResultModal = signal<boolean>(false);

  ngOnInit(): void {
    // Check ADMIN or OT access
    if (!this.authService.hasRole(['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'])) {
      this.toastService.error('Unauthorized', 'Only ADMIN or Online Payment Team (OT) can access Unclaimed Records');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.fetchRecords();

    // Auto-search on typing
    this.searchSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((query) => {
        const trimmed = (query || '').trim();
        if (trimmed.length >= 3 || trimmed.length === 0) {
          this.currentPage.set(1);
          this.fetchRecords();
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

  onSearchSubmit(): void {
    this.currentPage.set(1);
    this.fetchRequests();
  }

  fetchRequests(): void {
    this.fetchRecords();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  onStatusChange(statusVal: string): void {
    this.selectedStatus.set(statusVal);
    this.currentPage.set(1);
    this.fetchRecords();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.fetchRecords();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchRecords();
    }
  }

  fetchRecords(): void {
    this.isLoading.set(true);
    this.paymentService
      .getUnclaimedRecords(
        this.currentPage(),
        this.searchQuery(),
        this.selectedStatus(),
        this.pageSize()
      )
      .subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          if (res) {
            const results = res.results || res.data || [];
            this.records.set(results);
            const total = res.count ?? results.length;
            this.totalRecords.set(total);
            this.totalPages.set(Math.ceil(total / this.pageSize()) || 1);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Failed to load unclaimed records.';
          this.toastService.error('Error', msg);
        },
      });
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      this.toastService.error('Invalid File', 'Please upload a valid .xlsx or .xls Excel file.');
      input.value = '';
      return;
    }

    this.isUploading.set(true);
    this.paymentService.uploadUnclaimedRecords(file).subscribe({
      next: (res: any) => {
        this.isUploading.set(false);
        input.value = '';
        const msg = res.message || 'File uploaded successfully. Processing has started in the background.';
        this.toastService.success('Upload Started', msg);

        // Auto-refresh the list after background processing
        setTimeout(() => this.fetchRecords(), 2500);
        setTimeout(() => this.fetchRecords(), 6000);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        input.value = '';
        const msg = err.error?.message || err.error?.error || 'Failed to start upload process.';
        this.toastService.error('Upload Failed', msg);
      },
    });
  }

  downloadSampleFormat(): void {
    this.paymentService.downloadUnclaimedSample().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_unclaimed_records.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toastService.success('Downloaded', 'Sample template downloaded.');
      },
      error: () => {
        this.toastService.error('Error', 'Failed to download sample file.');
      },
    });
  }

  exportToExcel(): void {
    this.isExporting.set(true);
    this.paymentService
      .exportUnclaimedRecords(this.searchQuery(), this.selectedStatus())
      .subscribe({
        next: (blob: Blob) => {
          this.isExporting.set(false);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `unclaimed_records_${new Date().toISOString().slice(0, 10)}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.toastService.success('Export Complete', 'Unclaimed records exported successfully.');
        },
        error: () => {
          this.isExporting.set(false);
          this.toastService.error('Export Failed', 'Failed to export records.');
        },
      });
  }

  closeResultModal(): void {
    this.showUploadResultModal.set(false);
  }

  // Row Action Handlers
  onView(record: any): void {
    if (record.generated_receipt_url) {
      window.open(record.generated_receipt_url, '_blank');
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
    if (record.generated_receipt_url) {
      const a = document.createElement('a');
      a.href = record.generated_receipt_url;
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

  onSendWhatsApp(record: any): void {
    if (this.isOT()) {
      this.toastService.error('Permission Denied', 'Online Payment Team members are not permitted to send WhatsApp receipts.');
      return;
    }
    if (!record.id) return;
    this.sendingWhatsApp.update((s) => new Set(s).add(record.id));
    this.paymentService.sendWhatsappReceipt(record.id).subscribe({
      next: () => {
        this.sendingWhatsApp.update((s) => {
          const next = new Set(s);
          next.delete(record.id);
          return next;
        });
        this.toastService.success('WhatsApp Receipt', 'Receipt sent via WhatsApp successfully!');
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
