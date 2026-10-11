import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TelecallingService } from '../../services/telecalling.service';
import {
  BranchAllocationRequestRecord,
  MasterSummaryData,
} from '../../models/telecalling.model';

@Component({
  selector: 'app-approve-assign',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approve-assign.component.html',
  styleUrl: './approve-assign.component.css',
})
export class ApproveAssignComponent implements OnInit, OnDestroy {
  private service = inject(TelecallingService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Data signals
  requestsList = signal<BranchAllocationRequestRecord[]>([]);
  totalRequests = signal<number>(0);
  masterSummary = signal<MasterSummaryData | null>(null);
  branchesList = signal<any[]>([]);

  // State flags & loading
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  uploadProgress = signal<number | null>(null);
  uploadStatusMessage = signal<string>('Uploading & Processing Data...');

  // Toast feedback
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'warning' | 'error'>('success');
  showToast = signal<boolean>(false);
  modalError = signal<string>('');

  // Search & Pagination
  searchQuery = signal<string>('');
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

  // Modals
  isUploadModalOpen = signal<boolean>(false);
  isFlushConfirmModalOpen = signal<boolean>(false);
  isAssignBranchModalOpen = signal<boolean>(false);
  isDownloadBranchModalOpen = signal<boolean>(false);

  // Table multi-selection for requests
  selectedRequestIds = signal<number[]>([]);

  // Branch Download Modal State
  downloadBranchMode = signal<'SINGLE' | 'MULTI'>('SINGLE');
  selectedSingleBranchId = signal<string>('');
  selectedMultiBranchIds = signal<number[]>([]);
  downloadCategory = signal<string>('ALL');
  isDownloadingBranchData = signal<boolean>(false);
  downloadBranchSearchQuery = signal<string>('');
  downloadModalError = signal<string>('');
  
  // Generic Action Confirmation Modal
  isActionConfirmModalOpen = signal<boolean>(false);
  actionConfirmTitle = signal<string>('');
  actionConfirmMessage = signal<string>('');
  actionConfirmButtonText = signal<string>('');
  actionConfirmButtonClass = signal<string>(''); // e.g. 'btn-update' or 'btn-delete-confirm'
  actionConfirmIcon = signal<string>(''); // e.g. 'check_circle' or 'cancel'
  actionConfirmIconBg = signal<string>(''); // e.g. 'var(--primary)' or 'var(--role-admin-bg)'
  actionConfirmIconColor = signal<string>(''); // e.g. 'white' or 'var(--role-admin-color)'
  
  pendingAction = signal<(() => void) | null>(null);

  // Form Inputs: Upload Base
  uploadCategory = signal<'BASE' | 'NON BASE'>('BASE');
  selectedFile = signal<File | null>(null);
  uploadFileName = signal<string>('No file chosen');

  // Form Inputs: Admin Direct Assign to Branch
  assignBranchId = signal<number | string>('');
  assignBranchCategory = signal<'BASE' | 'NON BASE'>('BASE');
  assignBranchQuantity = signal<number | null>(null);
  
  // Custom dropdown search for Branch Assign
  assignBranchSearchQuery = signal<string>('');
  isAssignBranchDropdownOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
    this.loadBranches();

    // Auto-fetch when user types 3 or more characters (or clears input)
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
          this.fetchRequests();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBranches(): void {
    this.service.fetchBranches({ page_size: 1000 }).subscribe({
      next: (branches) => this.branchesList.set(branches),
      error: (err) => console.error('Error fetching branches:', err),
    });
  }

  triggerToast(msg: string, type?: 'success' | 'warning' | 'error', duration: number = 6000): void {
    if (!type) {
      if (msg.includes('skipped') || msg.includes('Note:') || msg.includes('no more')) {
        type = 'warning';
      } else {
        type = 'success';
      }
    }
    this.toastMessage.set(msg);
    this.toastType.set(type);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, duration);
  }

  loadData(): void {
    this.isLoading.set(true);
    this.fetchRequests();

    this.service.fetchMasterSummary().subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.masterSummary.set(res.data);
        }
      },
      error: (err: any) => console.error('Error fetching master summary:', err),
    });
  }

  fetchRequests(): void {
    let params: any = {
      page: this.currentPage().toString(),
      per_page: this.pageSize().toString()
    };
    
    if (this.searchQuery()) {
      params['search'] = this.searchQuery();
    }

    this.service.fetchAllocationRequests(params).subscribe({
      next: (data) => {
        this.requestsList.set(data.results);
        this.totalRequests.set(data.count);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.isLoading.set(false);
      },
    });
  }

  // Handle page & search changes
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchRequests();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.fetchRequests();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSearchSubmit(): void {
    this.currentPage.set(1);
    this.fetchRequests();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  paginatedRecords = computed(() => {
    return this.requestsList();
  });

  totalPages = computed(() => {
    return Math.ceil(this.totalRequests() / this.pageSize()) || 1;
  });

  pagesArray = computed(() => {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= Math.min(total, 6); i++) {
      pages.push(i);
    }
    return pages;
  });

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchRequests();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.setPage(this.currentPage() + 1);
    }
  }

  lastPage(): void {
    this.setPage(this.totalPages());
  }

  // Admin Actions: Upload Base Excel
  onOpenUploadModal(): void {
    this.uploadCategory.set('BASE');
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    if (this.isSubmitting()) return;
    this.isUploadModalOpen.set(false);
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.uploadProgress.set(null);
  }

  onFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.uploadFileName.set(file.name);
    } else {
      this.selectedFile.set(null);
      this.uploadFileName.set('No file chosen');
    }
  }

  onSubmitUpload(): void {
    const file = this.selectedFile();

    if (!file) {
      this.triggerToast('Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }

    this.isSubmitting.set(true);
    this.uploadProgress.set(0);
    this.uploadStatusMessage.set('Uploading file to server...');

    this.service.uploadExcelWithProgress(file).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total && event.loaded >= event.total) {
            this.uploadStatusMessage.set('File uploaded! Processing records on server...');
          } else {
            this.uploadStatusMessage.set('Uploading file to server...');
          }
        } else if (event.type === HttpEventType.Response) {
          this.isSubmitting.set(false);
          this.uploadProgress.set(null);
          this.closeUploadModal();
          const msg = event.body?.message || 'File uploaded and parsed successfully!';
          this.triggerToast(msg);
          this.loadData();
        }
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.uploadProgress.set(null);
        console.error('Error uploading excel:', err);
        const errorMsg = err.error?.message || 'Failed to upload Excel file.';
        this.triggerToast(errorMsg);
      },
    });
  }

  onDownloadSampleExcel(): void {
    this.service.downloadSampleTemplate().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_telecalling_upload.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.triggerToast('Sample template downloaded successfully.');
      },
      error: () => {
        const headers = ['NAME', 'MOBILE NUMBER', 'DOB', 'ANNIVERSARY', 'BASE CATEGORY'];
        const rows = [
          ['NANDHA', '9500853111', '9/18/2026', '9/18/2026', 'BASE'],
          ['KAVITHA S', '9876543210', '5/12/1995', '11/20/2020', 'NON BASE']
        ];
        let csv = headers.join(',') + '\n';
        rows.forEach(r => { csv += r.map(v => `"${v}"`).join(',') + '\n'; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_telecalling_upload.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.triggerToast('Sample template downloaded.');
      }
    });
  }

  // Admin Actions: Download & Flush Unallocated Master Data
  onDownloadUnallocatedData(): void {
    this.isExporting.set(true);
    this.service.exportUnallocatedExcel('ALL').subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Unallocated_Master_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.triggerToast('Unallocated master data downloaded successfully.');
      },
      error: (err: any) => {
        console.error('Error downloading unallocated data:', err);
        this.isExporting.set(false);
        this.triggerToast('Failed to download unallocated master data.');
      },
    });
  }

  onOpenFlushModal(): void {
    this.isFlushConfirmModalOpen.set(true);
  }

  closeFlushModal(): void {
    this.isFlushConfirmModalOpen.set(false);
  }

  onConfirmFlushUnallocated(): void {
    this.isSubmitting.set(true);
    this.service.flushUnallocated('ALL').subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeFlushModal();
        const msg = res.message || 'Unallocated master pool data cleared.';
        this.triggerToast(msg);
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error flushing master data:', err);
        this.triggerToast('Failed to flush unallocated master data.');
      },
    });
  }

  // Generic Confirmation Actions
  openActionConfirm(title: string, message: string, buttonText: string, buttonClass: string, icon: string, iconBg: string, iconColor: string, action: () => void): void {
    this.actionConfirmTitle.set(title);
    this.actionConfirmMessage.set(message);
    this.actionConfirmButtonText.set(buttonText);
    this.actionConfirmButtonClass.set(buttonClass);
    this.actionConfirmIcon.set(icon);
    this.actionConfirmIconBg.set(iconBg);
    this.actionConfirmIconColor.set(iconColor);
    this.pendingAction.set(action);
    this.isActionConfirmModalOpen.set(true);
  }

  closeActionConfirm(): void {
    this.isActionConfirmModalOpen.set(false);
    this.pendingAction.set(null);
  }

  executeActionConfirm(): void {
    const action = this.pendingAction();
    if (action) {
      action();
    }
    this.closeActionConfirm();
  }

  // Admin Request Actions: Approve / Reject
  onApproveRequest(req: BranchAllocationRequestRecord): void {
    this.openActionConfirm(
      'Approve Request',
      `Approve request #${req.id} for ${req.requestedQuantity} ${req.category} numbers for ${req.branchName}?`,
      'Approve',
      'btn-update',
      'check_circle',
      'var(--primary)',
      'white',
      () => {
        this.service.approveAllocationRequest(req.id).subscribe({
          next: (res: any) => {
            this.triggerToast(`Request #${req.id} approved successfully!`);
            this.loadData();
          },
          error: (err: any) => {
            console.error('Error approving request:', err);
            const msg = err.error?.message || 'Failed to approve request.';
            this.triggerToast(msg, 'error');
          },
        });
      }
    );
  }

  onRejectRequest(req: BranchAllocationRequestRecord): void {
    this.openActionConfirm(
      'Reject Request',
      `Reject request #${req.id} (${req.branchName})?`,
      'Reject',
      'btn-delete-confirm',
      'cancel',
      'var(--role-admin-bg)',
      'var(--role-admin-color)',
      () => {
        this.service.rejectAllocationRequest(req.id).subscribe({
          next: (res: any) => {
            this.triggerToast(`Request #${req.id} rejected.`);
            this.loadData();
          },
          error: (err: any) => {
            console.error('Error rejecting request:', err);
            const msg = err.error?.message || 'Failed to reject request.';
            this.triggerToast(msg, 'error');
          },
        });
      }
    );
  }

  onDownloadRequestRecords(req: BranchAllocationRequestRecord): void {
    const url = `${this.service.endPoint.telecallingRequests}${req.id}/export/`;
    this.service.httpClient.get(url, { headers: this.service.headers, responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `Allocation_Request_${req.id}_Records.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
        this.triggerToast('Export downloaded successfully.');
      },
      error: (err: any) => {
        console.error('Error downloading records:', err);
        this.triggerToast('Failed to download exported records.', 'error');
      },
    });
  }

  // Admin Action: Assign Data Directly to Branch
  onOpenAssignBranchModal(): void {
    this.assignBranchId.set('');
    this.assignBranchCategory.set('BASE');
    this.assignBranchQuantity.set(null);
    this.assignBranchSearchQuery.set('');
    this.isAssignBranchDropdownOpen.set(false);
    this.modalError.set('');
    this.isAssignBranchModalOpen.set(true);
  }

  closeAssignBranchModal(): void {
    this.modalError.set('');
    this.isAssignBranchModalOpen.set(false);
  }

  toggleAssignBranchDropdown(): void {
    this.isAssignBranchDropdownOpen.update((v) => !v);
  }

  closeAssignBranchDropdown(): void {
    this.isAssignBranchDropdownOpen.set(false);
  }

  selectAssignBranch(branchId: number | string): void {
    this.assignBranchId.set(branchId);
    this.closeAssignBranchDropdown();
  }

  getFilteredAssignBranches(): any[] {
    const query = this.assignBranchSearchQuery().toLowerCase().trim();
    if (!query) {
      return this.branchesList();
    }
    return this.branchesList().filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.code.toLowerCase().includes(query)
    );
  }

  getAssignBranchName(): string {
    const id = this.assignBranchId();
    if (!id) return 'Select Branch';
    const b = this.branchesList().find((item) => item.id == id);
    return b ? `${b.code} - ${b.name}` : 'Select Branch';
  }

  onSubmitAssignBranch(): void {
    const branchId = Number(this.assignBranchId());
    const category = this.assignBranchCategory();
    const qty = this.assignBranchQuantity();
    this.modalError.set('');

    if (!branchId) {
      this.modalError.set('Please select a target Branch.');
      return;
    }
    if (!qty || qty <= 0) {
      this.modalError.set('Please enter a valid quantity.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.createAllocationRequest(category, qty, branchId, true).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeAssignBranchModal();
        const serverMsg = res.message || 'Data allocated directly to branch successfully!';
        this.triggerToast(serverMsg);
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error creating branch allocation:', err);
        const errMsg = err.error?.message || 'Failed to assign numbers to branch.';
        this.modalError.set(errMsg);
        this.triggerToast(errMsg, 'error');
      },
    });
  }

  // --- Table Request Multi-Selection & Export ---
  approvedRequests = computed(() => this.requestsList().filter((r) => r.status === 'APPROVED'));

  isRequestSelected(reqId: number): boolean {
    return this.selectedRequestIds().includes(reqId);
  }

  toggleRequestSelection(reqId: number): void {
    this.selectedRequestIds.update((current) =>
      current.includes(reqId) ? current.filter((id) => id !== reqId) : [...current, reqId]
    );
  }

  isAllApprovedSelected = computed(() => {
    const approved = this.approvedRequests();
    return approved.length > 0 && approved.every((r) => this.selectedRequestIds().includes(r.id));
  });

  toggleSelectAllApproved(): void {
    const approved = this.approvedRequests();
    if (this.isAllApprovedSelected()) {
      this.selectedRequestIds.set([]);
    } else {
      this.selectedRequestIds.set(approved.map((r) => r.id));
    }
  }

  clearSelectedRequests(): void {
    this.selectedRequestIds.set([]);
  }

  onDownloadSelectedRequests(): void {
    const reqIds = this.selectedRequestIds();
    if (reqIds.length === 0) {
      this.triggerToast('Please select at least one approved request.', 'warning');
      return;
    }

    this.isExporting.set(true);
    this.service.exportBranchPoolExcel({ requestIds: reqIds }).subscribe({
      next: (blob: Blob) => {
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `Selected_Allocation_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
        this.isExporting.set(false);
        this.triggerToast(`Exported ${reqIds.length} request(s) into single Excel file.`);
      },
      error: (err: any) => {
        this.isExporting.set(false);
        console.error('Error downloading selected requests:', err);
        this.triggerToast('Failed to download exported records.', 'error');
      },
    });
  }

  // --- Branch Download Modal Methods ---
  onOpenDownloadBranchModal(): void {
    this.downloadBranchMode.set('SINGLE');
    this.selectedSingleBranchId.set('');
    this.selectedMultiBranchIds.set([]);
    this.downloadCategory.set('ALL');
    this.downloadBranchSearchQuery.set('');
    this.downloadModalError.set('');
    this.isDownloadBranchModalOpen.set(true);
  }

  closeDownloadBranchModal(): void {
    this.downloadModalError.set('');
    this.isDownloadBranchModalOpen.set(false);
  }

  getFilteredDownloadBranches(): any[] {
    const query = this.downloadBranchSearchQuery().toLowerCase().trim();
    if (!query) return this.branchesList();
    return this.branchesList().filter(
      (b) =>
        (b.name && b.name.toLowerCase().includes(query)) ||
        (b.code && b.code.toLowerCase().includes(query))
    );
  }

  isBranchMultiSelected(branchId: number): boolean {
    return this.selectedMultiBranchIds().includes(branchId);
  }

  toggleMultiBranchSelection(branchId: number): void {
    this.selectedMultiBranchIds.update((current) =>
      current.includes(branchId) ? current.filter((id) => id !== branchId) : [...current, branchId]
    );
  }

  toggleSelectAllBranches(): void {
    const list = this.getFilteredDownloadBranches();
    const allIds = list.map((b) => b.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => this.selectedMultiBranchIds().includes(id));
    if (allSelected) {
      this.selectedMultiBranchIds.update((current) => current.filter((id) => !allIds.includes(id)));
    } else {
      this.selectedMultiBranchIds.update((current) => Array.from(new Set([...current, ...allIds])));
    }
  }

  isAllBranchesSelected = computed(() => {
    const list = this.branchesList();
    return list.length > 0 && list.every((b) => this.selectedMultiBranchIds().includes(b.id));
  });

  onSubmitDownloadBranchData(): void {
    this.downloadModalError.set('');
    let branchIds: number[] = [];

    if (this.downloadBranchMode() === 'SINGLE') {
      const bId = this.selectedSingleBranchId();
      if (!bId) {
        this.downloadModalError.set('Please select a branch to download.');
        return;
      }
      branchIds = [parseInt(bId, 10)];
    } else {
      branchIds = this.selectedMultiBranchIds();
      if (branchIds.length === 0) {
        this.downloadModalError.set('Please select at least one branch.');
        return;
      }
    }

    this.isDownloadingBranchData.set(true);
    const category = this.downloadCategory();

    this.service.exportBranchPoolExcel({ branchIds, category }).subscribe({
      next: (blob: Blob) => {
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        const bCount = branchIds.length;
        const bName = bCount === 1 ? (this.branchesList().find((b) => b.id === branchIds[0])?.name || 'Branch') : `${bCount}_Branches`;
        a.download = `${bName}_Allocated_Records_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
        this.isDownloadingBranchData.set(false);
        this.closeDownloadBranchModal();
        this.triggerToast(`Excel downloaded successfully for ${bCount} branch(es).`);
      },
      error: (err: any) => {
        this.isDownloadingBranchData.set(false);
        console.error('Error downloading branch data:', err);
        const msg = err.error?.message || 'Failed to download branch data.';
        this.downloadModalError.set(msg);
        this.triggerToast(msg, 'error');
      },
    });
  }
}

