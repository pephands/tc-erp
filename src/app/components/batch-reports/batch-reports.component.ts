import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { OnlinePaymentRecord } from '../../models/payment.model';

import { ToastService } from '../../services/toast.service';
import { AddOnlinePaymentModalComponent } from '../../modals/add-online-payment-modal/add-online-payment-modal.component';

@Component({
  selector: 'app-batch-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AddOnlinePaymentModalComponent],
  templateUrl: './batch-reports.component.html',
  styleUrl: './batch-reports.component.css'
})
export class BatchReportsComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  isAdmin = signal<boolean>(false);
  isManager = signal<boolean>(false);
  isTL = signal<boolean>(false);
  deletingRecordId = signal<number | null>(null);
  activeTab = signal<string>('');

  // Data & State for Records
  records = signal<OnlinePaymentRecord[]>([]);
  
  // Data & State for Batches
  batches = signal<any[]>([]);
  pendingBatches = signal<any[]>([]);

  // Batch branch stats mapping: batch_id -> stats[]
  batchBranchStats = signal<Record<number, any[]>>({});
  // Batch records mapping: batch_id -> records[]
  batchRecords = signal<Record<number, any[]>>({});

  expandedBatchId = signal<number | null>(null);

  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  downloadingBatchId = signal<number | null>(null);
  downloadingBatchName = signal<string>('');
  uploadMessage = signal<string>('');
  uploadError = signal<string>('');

  @ViewChild('fileInput') fileInput!: ElementRef;

  // Edit Modal State
  showEditModal = signal<boolean>(false);
  selectedRecord = signal<OnlinePaymentRecord | null>(null);

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Pagination (For Records)
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
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR', 'OT']));
    this.isManager.set(this.authService.hasRole(['MANAGER']) && !this.isAdmin());
    this.isTL.set(this.authService.hasRole(['TL', 'TEAM LEAD', 'TEAM LEADER']));
    
    // Set default tab based on role
    if (this.isAdmin()) {
      this.activeTab.set('PENDING_BATCHES');
    } else if (this.isManager()) {
      this.activeTab.set('BATCHES');
    } else {
      this.activeTab.set('RECORDS');
    }
    
    this.fetchDataForActiveTab();
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.expandedBatchId.set(null);
    
    // Reset filters on tab switch
    this.searchQuery.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.isFilterApplied.set(false);
    
    // Default to today's date for completed batches if no date is set
    if (tab === 'COMPLETED_BATCHES') {
      const today = new Date();
      const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      this.startDate.set(localDate);
      this.endDate.set(localDate);
      this.updateFilterState();
    }
    
    this.fetchDataForActiveTab();
  }

  fetchDataForActiveTab(): void {
    this.expandedBatchId.set(null);
    const tab = this.activeTab();
    if (tab === 'PENDING_BATCHES') {
      this.fetchPendingBatchRecords();
      this.fetchPendingBatchesList();
    } else if (tab === 'COMPLETED_BATCHES') {
      this.fetchBatches('COMPLETED');
    } else if (tab === 'OVERALL_BATCHES' || tab === 'BATCHES') {
      this.fetchBatches('');
    } else if (tab === 'RECORDS') {
      this.fetchRecords();
    }
  }

  fetchPendingBatchRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const page = this.currentPage();
    const pageSize = this.pageSize();

    this.paymentService.getRecords(
      '',
      search,
      '',
      '',
      page,
      '',
      false,
      '',
      false,
      '',
      '',
      pageSize,
      'PENDING'
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

        this.records.set(items);
        this.totalCount.set(count);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching pending batch records:', err);
        this.isLoading.set(false);
      }
    });
  }

  fetchPendingBatchesList(): void {
    this.paymentService.getBatchReports('', '', 'PENDING', 1, 100).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.results) {
          items = res.results;
        } else if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }
        this.pendingBatches.set(items);
      },
      error: () => {}
    });
  }

  fetchRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();

    this.paymentService.getRecords('EMPTY,RESEND,NEW', search, start, end, page, '', true, '', false, '', '', this.pageSize()).subscribe({
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

  exportTcSubmitDetails(): void {
    if (this.isExporting()) return;
    this.isExporting.set(true);

    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();

    this.paymentService.getRecords(
      'EMPTY,RESEND,NEW',
      search,
      start,
      end,
      1,
      '',
      true,
      '',
      true,
      '',
      '',
      10000
    ).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (res && res.results) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        }

        if (items.length === 0) {
          this.showToast('No records found to export.', true);
          this.isExporting.set(false);
          return;
        }

        const exportData = items.map((rec: any) => {
          let submittedDateStr = '';
          if (rec.created_at) {
            try {
              const d = new Date(rec.created_at);
              submittedDateStr = !isNaN(d.getTime()) ? d.toISOString().replace('T', ' ').substring(0, 16) : rec.created_at;
            } catch {
              submittedDateStr = rec.created_at;
            }
          }

          return {
            'Task ID': rec.task_id || '-',
            'Submitted Date': submittedDateStr || '-',
            'Payment Date': rec.payment_date || '-',
            'Donor Name': rec.donor_name || '-',
            'Donor Mobile': rec.mobile_number || '-',
            'Alt Mobile': rec.alt_mobile_number || '-',
            'PAN Number': rec.pan_number || '-',
            'Amount': rec.amount != null ? Number(rec.amount) : 0,
            'Reference ID': rec.reference_id || '-',
            'Payment Mode': rec.mode_of_payment || '-',
            'Donor Type': rec.donor_type || '-',
            'Slab': rec.slab || '-',
            'Status': rec.status || 'NEW',
            'Telecaller Name': rec.telecaller_name || (rec.telecaller?.full_name || '-'),
            'TC Employee ID': rec.telecaller_employee_Id || (rec.telecaller?.employee_Id || '-'),
            'Branch Name': rec.branch_name || (rec.branch?.name || '-'),
            'Remarks': rec.remarks || '-',
            'Receipt ID': rec.receipt_id || '-',
            'Correction Name': rec.correction_name || '-',
            'Address': rec.address || '-'
          };
        });

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'TC Submitted Records');

        const todayStr = new Date().toISOString().split('T')[0];
        const branchName = items[0]?.branch_name ? items[0].branch_name.replace(/\s+/g, '_') : 'Branch';
        const filename = `TC_Submitted_Records_${branchName}_${todayStr}.xlsx`;

        XLSX.writeFile(wb, filename);
        this.showToast(`Successfully exported ${items.length} records.`, false);
        this.isExporting.set(false);
      },
      error: (err: any) => {
        console.error('Error exporting TC submit details:', err);
        this.showToast('Failed to export records.', true);
        this.isExporting.set(false);
      }
    });
  }

  fetchBatches(status: string): void {
    this.isLoading.set(true);
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();

    this.paymentService.getBatchReports(start, end, status, page).subscribe({
      next: (res: any) => {
        let items: any[] = [];
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

        this.batches.set(items);
        this.totalCount.set(count);
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
    this.downloadingBatchId.set(runId);
    this.downloadingBatchName.set(configName || 'Batch');
    this.isDownloading.set(true);

    this.paymentService.downloadBatchReport(runId).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        if (items.length === 0) {
          this.showToast('No records found in this batch.', true);
          this.isDownloading.set(false);
          this.downloadingBatchId.set(null);
          return;
        }

        const formatDmy = (dateVal: any, sep: string = '-', monthName: boolean = true) => {
          if (!dateVal) return '';
          try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return dateVal;
            const day = String(d.getDate()).padStart(2, '0');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthName ? monthNames[d.getMonth()] : String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}${sep}${month}${sep}${year}`;
          } catch {
            return dateVal;
          }
        };

        const exportData = items.map((rec: any) => {
          const empId = rec.telecaller_employee_Id || rec.telecaller_id_card_number || '';
          const empName = rec.telecaller_name || empId || '';

          return {
            'Task Id': rec.task_id || '',
            'Payment date': formatDmy(rec.payment_date, '-', true),
            'Customer Name': rec.donor_name || '',
            'PAN Number': rec.pan_number || '',
            'Customer Number': rec.mobile_number || '',
            'Alternate Number': rec.alt_mobile_number || '',
            'Payment Details': rec.amount != null ? Number(rec.amount) : 0,
            'Reference Id': rec.reference_id || '',
            'Payment Mode': rec.mode_of_payment || '',
            'Employee ID': empId,
            'Employee Name': empName,
            'Branch Name': rec.branch_name || '',
            'Donor Type': rec.donor_type || '',
            'Slab': rec.slab || '',
            'Status': rec.status || '',
            'Created Date': formatDmy(rec.created_at, '-', true),
            'Batch': rec.batch_name || configName || '',
            'Remarks': rec.remarks || '',
            'Receipt Id': rec.receipt_id || '',
            'Correction Name': rec.correction_name || '',
            'DOB': formatDmy(rec.dob, '-', false),
            'Address': rec.address || ''
          };
        });

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Batch Data');

        const runFilenamePrefix = (configName || 'Batch').replace(/\s+/g, '_');
        const filename = `${runFilenamePrefix}_${date || 'export'}.xlsx`;

        XLSX.writeFile(wb, filename);
        this.isDownloading.set(false);
        this.downloadingBatchId.set(null);
      },
      error: (err: any) => {
        console.error('Error downloading batch:', err);
        this.showToast('Error downloading the batch file.', true);
        this.isDownloading.set(false);
        this.downloadingBatchId.set(null);
      }
    });
  }

  private toastTimeout: any = null;

  showToast(message: string, isError: boolean = false): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    if (isError) {
      this.uploadError.set(message);
      this.uploadMessage.set('');
    } else {
      this.uploadMessage.set(message);
      this.uploadError.set('');
    }
    this.toastTimeout = setTimeout(() => {
      this.uploadMessage.set('');
      this.uploadError.set('');
    }, 5000);
  }

  clearToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.uploadMessage.set('');
    this.uploadError.set('');
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        this.showToast('Only .xlsx files are allowed', true);
        return;
      }
      
      this.clearToast();
      this.isUploading.set(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      this.paymentService.uploadBatchFile(formData).subscribe({
        next: (res: any) => {
          this.isUploading.set(false);
          this.showToast(res.message || 'Successfully updated records. Batch completed if no pending records left.', false);
          this.fileInput.nativeElement.value = '';
          this.fetchDataForActiveTab(); // Refresh current tab data
        },
        error: (err: any) => {
          this.isUploading.set(false);
          this.showToast(err.error?.error || 'Error uploading file.', true);
          this.fileInput.nativeElement.value = '';
        }
      });
    }
  }

  // Filter Handlers
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterState();
    if (this.activeTab() === 'RECORDS' || this.activeTab() === 'PENDING_BATCHES') {
      this.currentPage.set(1);
      this.fetchDataForActiveTab();
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
      this.fetchDataForActiveTab();
    }
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchDataForActiveTab();
    }
  }



  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchDataForActiveTab();
    }
  }

  // Edit Handlers
  openEditModal(record: OnlinePaymentRecord): void {
    this.selectedRecord.set(record);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedRecord.set(null);
  }

  onEditSubmitted(): void {
    this.closeEditModal();
    this.fetchDataForActiveTab();
  }

  // Delete Handler (Restricted to TL role only)
  onDeleteRecord(rec: OnlinePaymentRecord): void {
    if (!this.isTL()) {
      this.toastService.warning('Unauthorized', 'Only Team Leaders are authorized to delete submitted records.');
      return;
    }

    const donorName = rec.donor_name || 'this record';
    const amountStr = rec.amount ? ` ₹${rec.amount}` : '';
    const refStr = rec.reference_id ? ` (Ref: ${rec.reference_id})` : '';

    if (!confirm(`Are you sure you want to permanently delete record for ${donorName}${amountStr}${refStr}?\n\nThis will permanently delete the record. This action cannot be undone.`)) {
      return;
    }

    this.deletingRecordId.set(rec.id);
    this.paymentService.deletePaymentRecord(rec.id).subscribe({
      next: (res: any) => {
        this.deletingRecordId.set(null);
        const msg = res?.message || 'Record permanently deleted successfully.';
        this.uploadMessage.set(msg);
        this.toastService.success('Record Deleted', msg);
        setTimeout(() => this.uploadMessage.set(''), 5000);
        this.fetchRecords();
      },
      error: (err: any) => {
        this.deletingRecordId.set(null);
        console.error('Error deleting record:', err);
        const errorMsg = err?.error?.message || 'Failed to delete record. Please try again.';
        this.uploadError.set(errorMsg);
        this.toastService.error('Delete Failed', errorMsg);
        setTimeout(() => this.uploadError.set(''), 5000);
      }
    });
  }
}
