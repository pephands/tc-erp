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
  currentTab = signal<'REQUESTS' | 'HISTORY' | 'SUMMARY'>('REQUESTS');
  allocationHistory = signal<any[]>([]);
  allocationSummary = signal<any[]>([]);

  // Allocated Bases details modal
  isAllocatedBasesModalOpen = signal<boolean>(false);
  allocatedBasesList = signal<any[]>([]);
  selectedTelecallerForBases = signal<any>(null);
  isLoadingAllocatedBases = signal<boolean>(false);
  
  // Filters for new features
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedTelecallerFilter = signal<string>('');

  // Loading & State flags
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Toast feedback
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  // Search & Pagination
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
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
    
    // Load History and Summary initially
    this.loadAllocationHistory();
    this.loadAllocationSummary();
  }

  setTab(tab: 'REQUESTS' | 'HISTORY' | 'SUMMARY') {
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
    if (this.selectedTelecallerFilter()) {
      params.telecaller_id = this.selectedTelecallerFilter();
    }
    
    this.service.fetchTCAllocationHistory(params).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.allocationHistory.set(res.data);
        } else if (res && res.results) {
          this.allocationHistory.set(res.results);
        }
      },
      error: (err) => console.error('Error fetching allocation history:', err),
    });
  }

  loadAllocationSummary(): void {
    const params = this.getFilterParams();
    this.service.fetchTCAllocationSummary(params).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.allocationSummary.set(res.data);
        }
      },
      error: (err) => console.error('Error fetching allocation summary:', err),
    });
  }

  onFilterChange(): void {
    this.loadAllocationHistory();
    this.loadAllocationSummary();
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
        a.download = 'allocation_history.csv';
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
        a.download = 'allocation_summary.csv';
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

  onViewAllocatedBases(item: any): void {
    this.selectedTelecallerForBases.set(item);
    this.isAllocatedBasesModalOpen.set(true);
    this.isLoadingAllocatedBases.set(true);
    this.allocatedBasesList.set([]);

    const params = this.getFilterParams();
    this.service.fetchTCAllocatedBases(item.telecaller_id, params).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.allocatedBasesList.set(res.data);
        }
        this.isLoadingAllocatedBases.set(false);
      },
      error: (err) => {
        console.error('Error fetching allocated bases:', err);
        this.isLoadingAllocatedBases.set(false);
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
        a.download = `allocated_bases_tc_${item.telecaller_id}.csv`;
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

