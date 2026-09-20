import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { OnlinePaymentRecord } from '../../models/payment.model';

@Component({
  selector: 'app-batch-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-reports.component.html',
  styleUrl: './batch-reports.component.css'
})
export class BatchReportsComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);

  isAdmin = signal<boolean>(false);
  activeTab = signal<string>('');

  // Data & State for Records
  records = signal<OnlinePaymentRecord[]>([]);
  
  // Data & State for Batches
  batches = signal<any[]>([]);

  // Batch branch stats mapping: batch_id -> stats[]
  batchBranchStats = signal<Record<number, any[]>>({});
  // Batch records mapping: batch_id -> records[]
  batchRecords = signal<Record<number, any[]>>({});

  expandedBatchId = signal<number | null>(null);

  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  uploadMessage = signal<string>('');
  uploadError = signal<string>('');

  @ViewChild('fileInput') fileInput!: ElementRef;

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Pagination (For Records)
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  ngOnInit(): void {
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
    
    // Set default tab based on role
    this.activeTab.set(this.isAdmin() ? 'PENDING_BATCHES' : 'RECORDS');
    
    this.fetchDataForActiveTab();
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.expandedBatchId.set(null);
    this.fetchDataForActiveTab();
  }

  fetchDataForActiveTab(): void {
    this.expandedBatchId.set(null);
    const tab = this.activeTab();
    if (tab === 'PENDING_BATCHES') {
      this.fetchBatches('PENDING');
    } else if (tab === 'COMPLETED_BATCHES') {
      this.fetchBatches('COMPLETED');
    } else if (tab === 'OVERALL_BATCHES' || tab === 'BATCHES') {
      this.fetchBatches('');
    } else if (tab === 'RECORDS') {
      this.fetchRecords();
    }
  }

  fetchRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();

    this.paymentService.getRecords('EMPTY,RESEND', search, start, end, page).subscribe({
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
        console.error('Error fetching records:', err);
        this.isLoading.set(false);
      }
    });
  }

  fetchBatches(status: string): void {
    this.isLoading.set(true);
    const start = this.startDate();
    const end = this.endDate();

    this.paymentService.getBatchReports(start, end, status).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.batches.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching batches:', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleBatchExpansion(batchId: number): void {
    if (this.expandedBatchId() === batchId) {
      this.expandedBatchId.set(null);
      return;
    }
    
    this.expandedBatchId.set(batchId);
    
    // Fetch details based on role and tab
    if (this.isAdmin() && this.activeTab() === 'OVERALL_BATCHES') {
      if (!this.batchBranchStats()[batchId]) {
        this.paymentService.getBatchBranchStats(batchId).subscribe(res => {
          if (res.status === 'success') {
            const currentStats = { ...this.batchBranchStats() };
            currentStats[batchId] = res.data;
            this.batchBranchStats.set(currentStats);
          }
        });
      }
    } else if (!this.isAdmin() && this.activeTab() === 'BATCHES') {
      if (!this.batchRecords()[batchId]) {
        this.paymentService.getBatchRecords(batchId).subscribe(res => {
          if (res.status === 'success') {
            const currentRecs = { ...this.batchRecords() };
            currentRecs[batchId] = res.data;
            this.batchRecords.set(currentRecs);
          }
        });
      }
    }
  }

  downloadBatch(runId: number, configName: string, date: string, event: Event): void {
    event.stopPropagation();
    this.isLoading.set(true);
    this.paymentService.downloadBatchReport(runId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${configName}_${date}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error downloading batch:', err);
        this.uploadError.set('Error downloading the batch file.');
        this.isLoading.set(false);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        this.uploadError.set('Only .xlsx files are allowed');
        return;
      }
      
      this.uploadError.set('');
      this.uploadMessage.set('');
      this.isUploading.set(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      this.paymentService.uploadBatchFile(formData).subscribe({
        next: (res: any) => {
          this.isUploading.set(false);
          this.uploadMessage.set(res.message || 'Successfully updated records. Batch completed if no pending records left.');
          this.fileInput.nativeElement.value = '';
          this.fetchDataForActiveTab(); // Refresh current tab data
        },
        error: (err: any) => {
          this.isUploading.set(false);
          this.uploadError.set(err.error?.error || 'Error uploading file.');
          this.fileInput.nativeElement.value = '';
        }
      });
    }
  }

  // Filter Handlers
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterState();
    if (this.activeTab() === 'RECORDS') {
      this.currentPage.set(1);
      this.fetchRecords();
    }
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchDataForActiveTab();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchDataForActiveTab();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchDataForActiveTab();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || this.startDate() || this.endDate()));
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchRecords();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchRecords();
    }
  }
}
