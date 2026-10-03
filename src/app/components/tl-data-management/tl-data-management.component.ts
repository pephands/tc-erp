import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelecallingService } from '../../services/telecalling.service';
import {
  BranchAllocationRequestRecord,
  BranchPoolData,
  MasterSummaryData,
  TelecallerUserOption,
} from '../../models/telecalling.model';

@Component({
  selector: 'app-tl-data-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tl-data-management.component.html',
  styleUrl: './tl-data-management.component.css',
})
export class TlDataManagementComponent implements OnInit {
  private service = inject(TelecallingService);

  // Data signals
  branchPool = signal<BranchPoolData | null>(null);
  masterSummary = signal<MasterSummaryData | null>(null);
  requestsList = signal<BranchAllocationRequestRecord[]>([]);
  telecallersList = signal<TelecallerUserOption[]>([]);
  
  // New features
  currentTab = signal<'REQUESTS' | 'HISTORY' | 'SUMMARY' | 'TL_UPLOADS'>('REQUESTS');
  allocationHistory = signal<any[]>([]);
  allocationSummary = signal<any[]>([]);
  tlUploadsList = signal<any[]>([]);

  // Allocated Bases details modal
  isAllocatedBasesModalOpen = signal<boolean>(false);
  allocatedBasesList = signal<any[]>([]);
  selectedTelecallerForBases = signal<any>(null);
  isLoadingAllocatedBases = signal<boolean>(false);
  
  modalPage = signal<number>(1);
  hasMoreModalRecords = signal<boolean>(true);
  isLoadingMoreModal = signal<boolean>(false);

  // TL Upload Modal
  isTlUploadModalOpen = signal<boolean>(false);
  selectedTlUploadFile = signal<File | null>(null);
  
  // Filters for new features
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedTelecallerFilter = signal<string>('');
  
  // Summary pagination
  summaryCurrentPage = signal<number>(1);
  summaryTotalPages = signal<number>(1);
  summaryPagesArray = computed(() => Array.from({ length: Math.min(this.summaryTotalPages(), 6) }, (_, i) => i + 1));

  // History pagination
  historyCurrentPage = signal<number>(1);
  historyTotalPages = signal<number>(1);
  historyPagesArray = computed(() => Array.from({ length: Math.min(this.historyTotalPages(), 6) }, (_, i) => i + 1));

  // TL Uploads pagination
  tlUploadsCurrentPage = signal<number>(1);
  tlUploadsTotalPages = signal<number>(1);
  tlUploadsPagesArray = computed(() => Array.from({ length: Math.min(this.tlUploadsTotalPages(), 6) }, (_, i) => i + 1));

  // Loading & State flags
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Toast feedback
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

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
  isSubmitModalOpen = signal<boolean>(false);
  isAssignTcModalOpen = signal<boolean>(false);

  // Form Inputs: Submit Batch Request to Admin
  submitCategory = signal<'BASE' | 'NON BASE'>('BASE');
  submitQuantity = signal<number | null>(null);

  // Form Inputs: Assign to Telecaller
  selectedTcIds = signal<number[]>([]);
  assignCategory = signal<'BASE' | 'NON BASE'>('BASE');
  assignQuantity = signal<number | null>(null);
  lastClickedIndex = signal<number | null>(null);

  // Multi-select Telecallers Helpers
  toggleTelecallerSelection(tcId: number): void {
    this.selectedTcIds.update((current) =>
      current.includes(tcId) ? current.filter((id) => id !== tcId) : [...current, tcId]
    );
  }

  isTcSelected(tcId: number): boolean {
    return this.selectedTcIds().includes(tcId);
  }

  onTelecallerClick(event: MouseEvent, tcId: number, index: number): void {
    event.preventDefault();
    event.stopPropagation();

    const list = this.telecallersList();
    const isShift = event.shiftKey;

    if (isShift && this.lastClickedIndex() !== null) {
      // Range selection between lastClickedIndex and current index
      const start = Math.min(this.lastClickedIndex()!, index);
      const end = Math.max(this.lastClickedIndex()!, index);
      const rangeIds = list.slice(start, end + 1).map((t) => t.id);

      this.selectedTcIds.update((current) => {
        const set = new Set([...current, ...rangeIds]);
        return Array.from(set);
      });
      this.lastClickedIndex.set(index);
    } else {
      // Single toggle selection
      this.toggleTelecallerSelection(tcId);
      this.lastClickedIndex.set(index);
    }
  }

  toggleSelectAllTelecallers(): void {
    const list = this.telecallersList();
    if (this.selectedTcIds().length === list.length) {
      this.selectedTcIds.set([]);
      this.lastClickedIndex.set(null);
    } else {
      this.selectedTcIds.set(list.map((tc) => tc.id));
      this.lastClickedIndex.set(null);
    }
  }

  isAllTelecallersSelected = computed(() => {
    const list = this.telecallersList();
    return list.length > 0 && this.selectedTcIds().length === list.length;
  });

  totalRequiredCount = computed(() => {
    const tcCount = this.selectedTcIds().length;
    const qtyPerTc = this.assignQuantity() || 0;
    return tcCount * qtyPerTc;
  });

  ngOnInit(): void {
    this.loadData();
    this.loadTelecallers();
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 4000);
  }

  loadData(): void {
    this.isLoading.set(true);

    // Load Master Summary for available counts
    this.service.fetchMasterSummary().subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.masterSummary.set(res.data);
        }
      },
      error: (err: any) => console.error('Error fetching master summary:', err),
    });

    // Load Branch Pool Stats
    this.service.fetchBranchPool().subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.branchPool.set(res.data);
        }
      },
      error: (err: any) => console.error('Error fetching branch pool:', err),
    });

    // Load Request History
    this.service.fetchAllocationRequests().subscribe({
      next: (data) => {
        this.requestsList.set(data.results);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.isLoading.set(false);
      },
    });
    
    // Load History, Summary, and Uploads initially
    this.loadAllocationHistory();
    this.loadAllocationSummary();
    this.loadTlUploads();
  }

  setTab(tab: 'REQUESTS' | 'HISTORY' | 'SUMMARY' | 'TL_UPLOADS') {
    this.currentTab.set(tab);
  }

  getFilterParams(): any {
    const params: any = {};
    if (this.startDate()) params.start_date = this.startDate();
    if (this.endDate()) params.end_date = this.endDate();
    return params;
  }

  loadAllocationHistory(): void {
    const params = this.getFilterParams();
    params.page = this.historyCurrentPage();
    if (this.selectedTelecallerFilter()) {
      params.telecaller_id = this.selectedTelecallerFilter();
    }
    
    this.service.fetchTCAllocationHistory(params).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.allocationHistory.set(res.results);
          this.historyTotalPages.set(Math.ceil(res.count / 10));
        } else if (res && res.status === 'success') {
          this.allocationHistory.set(res.data);
          this.historyTotalPages.set(1);
        }
      },
      error: (err) => console.error('Error fetching allocation history:', err),
    });
  }

  loadTlUploads(): void {
    const params = this.getFilterParams();
    params.page = this.tlUploadsCurrentPage();
    params.source = 'TL_DIRECT';
    if (this.selectedTelecallerFilter()) {
      params.telecaller_id = this.selectedTelecallerFilter();
    }
    
    this.service.fetchTCAllocationHistory(params).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.tlUploadsList.set(res.results);
          this.tlUploadsTotalPages.set(Math.ceil(res.count / 10));
        } else if (res && res.status === 'success') {
          this.tlUploadsList.set(res.data);
          this.tlUploadsTotalPages.set(1);
        }
      },
      error: (err) => console.error('Error fetching TL uploads history:', err),
    });
  }

  loadAllocationSummary(): void {
    const params = this.getFilterParams();
    params.page = this.summaryCurrentPage();
    this.service.fetchTCAllocationSummary(params).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.allocationSummary.set(res.results);
          this.summaryTotalPages.set(Math.ceil(res.count / 10));
        } else if (res && res.status === 'success') {
          this.allocationSummary.set(res.data);
          this.summaryTotalPages.set(1);
        }
      },
      error: (err) => console.error('Error fetching allocation summary:', err),
    });
  }

  onFilterChange(): void {
    this.summaryCurrentPage.set(1);
    this.historyCurrentPage.set(1);
    this.tlUploadsCurrentPage.set(1);
    this.loadAllocationHistory();
    this.loadAllocationSummary();
    this.loadTlUploads();
  }

  setHistoryPage(page: number): void {
    if (page >= 1 && page <= this.historyTotalPages()) {
      this.historyCurrentPage.set(page);
      this.loadAllocationHistory();
    }
  }

  setSummaryPage(page: number): void {
    if (page >= 1 && page <= this.summaryTotalPages()) {
      this.summaryCurrentPage.set(page);
      this.loadAllocationSummary();
    }
  }

  setTlUploadsPage(page: number): void {
    if (page >= 1 && page <= this.tlUploadsTotalPages()) {
      this.tlUploadsCurrentPage.set(page);
      this.loadTlUploads();
    }
  }

  onDownloadHistory(): void {
    const params = this.getFilterParams();
    if (this.selectedTelecallerFilter()) {
      params.telecaller_id = this.selectedTelecallerFilter();
    }
    this.service.downloadTCAllocationHistory(params).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'allocation_history.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading history:', err)
    });
  }

  onDownloadSummary(): void {
    const params = this.getFilterParams();
    this.service.downloadTCAllocationSummary(params).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'allocation_summary.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading summary:', err)
    });
  }

  onDownloadBatchPDF(batchId: number): void {
    if (!batchId) return;
    this.service.downloadTCAllocationBatchPDF(batchId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TC_Allocation_Batch_${batchId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.triggerToast('Allocation batch PDF downloaded successfully.');
      },
      error: (err) => {
        console.error('Error downloading allocation PDF:', err);
        this.triggerToast('Failed to download allocation PDF.');
      }
    });
  }

  onDownloadBatchExcel(batchId: number): void {
    if (!batchId) return;
    this.service.downloadTCAllocationBatchExcel(batchId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TC_Allocation_Batch_${batchId}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.triggerToast('Allocation batch Excel downloaded successfully.');
      },
      error: (err) => {
        console.error('Error downloading allocation Excel:', err);
        this.triggerToast('Failed to download allocation Excel.');
      }
    });
  }

  onViewAllocatedBases(item: any): void {
    this.selectedTelecallerForBases.set(item);
    this.isAllocatedBasesModalOpen.set(true);
    this.isLoadingAllocatedBases.set(true);
    this.allocatedBasesList.set([]);
    this.modalPage.set(1);
    this.hasMoreModalRecords.set(true);

    const params = this.getFilterParams();
    params.page = 1;
    this.service.fetchTCAllocatedBases(item.telecaller_id, params).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.allocatedBasesList.set(res.results);
          this.hasMoreModalRecords.set(!!res.next);
        } else if (res && res.status === 'success') {
          this.allocatedBasesList.set(res.data);
          this.hasMoreModalRecords.set(false);
        }
        this.isLoadingAllocatedBases.set(false);
      },
      error: (err) => {
        console.error('Error fetching allocated bases:', err);
        this.isLoadingAllocatedBases.set(false);
      }
    });
  }

  onModalScroll(event: any): void {
    const el = event.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      if (!this.isLoadingMoreModal() && this.hasMoreModalRecords()) {
        this.loadMoreModalRecords();
      }
    }
  }

  loadMoreModalRecords(): void {
    const item = this.selectedTelecallerForBases();
    if (!item) return;

    this.isLoadingMoreModal.set(true);
    this.modalPage.update(p => p + 1);
    
    const params = this.getFilterParams();
    params.page = this.modalPage();

    this.service.fetchTCAllocatedBases(item.telecaller_id, params).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.allocatedBasesList.update(curr => [...curr, ...res.results]);
          this.hasMoreModalRecords.set(!!res.next);
        } else if (res && res.status === 'success') {
          this.hasMoreModalRecords.set(false);
        }
        this.isLoadingMoreModal.set(false);
      },
      error: (err) => {
        console.error('Error fetching more records:', err);
        this.isLoadingMoreModal.set(false);
      }
    });
  }

  closeAllocatedBasesModal(): void {
    this.isAllocatedBasesModalOpen.set(false);
  }

  onDownloadAllocatedBases(): void {
    const item = this.selectedTelecallerForBases();
    if (!item) return;

    const params = this.getFilterParams();
    this.service.downloadTCAllocatedBases(item.telecaller_id, params).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `allocated_bases_tc_${item.telecaller_id}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading allocated bases:', err)
    });
  }

  loadTelecallers(): void {
    this.service.fetchTelecallers().subscribe({
      next: (tcs) => this.telecallersList.set(tcs),
      error: (err) => console.error('Error loading telecallers:', err),
    });
  }

  // Filtered & Paginated requests
  filteredRecords = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.requestsList();

    if (!query) return list;

    return list.filter(
      (r) =>
        String(r.id).includes(query) ||
        (r.branchName && r.branchName.toLowerCase().includes(query)) ||
        (r.requestedByName && r.requestedByName.toLowerCase().includes(query)) ||
        r.category.toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query)
    );
  });

  paginatedRecords = computed(() => {
    const list = this.filteredRecords();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredRecords().length / this.pageSize()) || 1;
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
    }
  }

  // --- TL Direct Upload ---

  openTlUploadModal(): void {
    this.selectedTlUploadFile.set(null);
    this.isTlUploadModalOpen.set(true);
  }

  closeTlUploadModal(): void {
    this.isTlUploadModalOpen.set(false);
    this.selectedTlUploadFile.set(null);
  }

  onTlUploadFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedTlUploadFile.set(file);
    }
  }

  downloadTlUploadSample(): void {
    this.service.downloadTLDirectSampleTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tl_direct_upload_sample.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading sample:', err),
    });
  }

  onTlDirectUploadSubmit(): void {
    const file = this.selectedTlUploadFile();
    if (!file) {
      this.triggerToast('Please select a file to upload');
      return;
    }

    this.isLoading.set(true);
    this.service.uploadTLDirect(file).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.triggerToast(res.message || 'TL Base Upload successful');
        this.closeTlUploadModal();
        this.currentTab.set('TL_UPLOADS');
        this.loadTlUploads();
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.triggerToast(err.error?.message || 'Error uploading file');
      },
    });
  }

  onDownloadBatchRecords(batch: any): void {
    if (!batch.id) return;
    this.service.downloadBatchAllocatedBases(batch.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `TC_Allocation_Batch_${batch.id}.xlsx`;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading batch records:', err);
        this.triggerToast('Failed to download batch records');
      }
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPages());
  }

  // Request Batch Modal
  onOpenSubmitTaskModal(): void {
    this.submitCategory.set('BASE');
    this.submitQuantity.set(null);
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal(): void {
    this.isSubmitModalOpen.set(false);
  }

  onSubmitTaskRequest(): void {
    const qty = this.submitQuantity();
    if (!qty || qty <= 0) {
      alert('Please enter a valid requested quantity.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.createAllocationRequest(this.submitCategory(), qty).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeSubmitModal();
        this.triggerToast('Branch allocation request submitted to Admin successfully!');
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error submitting request:', err);
        const msg = err.error?.message || 'Failed to submit request.';
        alert(msg);
      },
    });
  }

  // Assign TC Modal
  onOpenAssignTcModal(): void {
    this.selectedTcIds.set([]);
    this.lastClickedIndex.set(null);
    this.assignCategory.set('BASE');
    this.assignQuantity.set(null);
    this.isAssignTcModalOpen.set(true);
  }

  closeAssignTcModal(): void {
    this.isAssignTcModalOpen.set(false);
  }

  onSubmitAssignTc(): void {
    const tcIds = this.selectedTcIds();
    const qty = this.assignQuantity();
    const category = this.assignCategory();

    if (tcIds.length === 0) {
      alert('Please select at least one Telecaller.');
      return;
    }
    if (!qty || qty <= 0) {
      alert('Please enter a valid count per telecaller.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.assignToTelecaller(tcIds, category, qty).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeAssignTcModal();
        const msg =
          res.message ||
          `Successfully assigned ${qty} ${category === 'BASE' ? 'Base' : 'Non Base'} numbers each to ${tcIds.length} telecallers!`;
        this.triggerToast(msg);
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error assigning to telecallers:', err);
        const errorMsg = err.error?.message || 'Failed to assign numbers to telecallers.';
        alert(errorMsg);
      },
    });
  }
}

