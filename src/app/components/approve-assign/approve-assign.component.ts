import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
export class ApproveAssignComponent implements OnInit {
  private service = inject(TelecallingService);

  // Data signals
  requestsList = signal<BranchAllocationRequestRecord[]>([]);
  totalRequests = signal<number>(0);
  masterSummary = signal<MasterSummaryData | null>(null);
  branchesList = signal<any[]>([]);

  // State flags & loading
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isExporting = signal<boolean>(false);

  // Toast feedback
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  // Search & Pagination
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Modals
  isUploadModalOpen = signal<boolean>(false);
  isFlushConfirmModalOpen = signal<boolean>(false);
  isAssignBranchModalOpen = signal<boolean>(false);

  // Form Inputs: Upload Base
  uploadCategory = signal<'BASE' | 'NON_BASE'>('BASE');
  selectedFile = signal<File | null>(null);
  uploadFileName = signal<string>('No file chosen');

  // Form Inputs: Admin Direct Assign to Branch
  assignBranchId = signal<number | string>('');
  assignBranchCategory = signal<'BASE' | 'NON_BASE'>('BASE');
  assignBranchQuantity = signal<number | null>(null);

  ngOnInit(): void {
    this.loadData();
    this.loadBranches();
  }

  loadBranches(): void {
    this.service.fetchBranches().subscribe({
      next: (branches) => this.branchesList.set(branches),
      error: (err) => console.error('Error fetching branches:', err),
    });
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

  // Handle page changes
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadData();
    }
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

  // Admin Actions: Upload Base Excel
  onOpenUploadModal(): void {
    this.uploadCategory.set('BASE');
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
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
    const category = this.uploadCategory();

    if (!file) {
      alert('Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.uploadExcel(file, category).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeUploadModal();
        const msg = res.message || 'File uploaded and parsed successfully!';
        this.triggerToast(msg);
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error uploading excel:', err);
        const errorMsg = err.error?.message || 'Failed to upload Excel file.';
        alert(errorMsg);
      },
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
        alert('Failed to download unallocated master data.');
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
        alert('Failed to flush unallocated master data.');
      },
    });
  }

  // Admin Request Actions: Approve / Reject
  onApproveRequest(req: BranchAllocationRequestRecord): void {
    if (confirm(`Approve request #${req.id} for ${req.requestedQuantity} ${req.category} numbers for ${req.branchName}?`)) {
      this.service.approveAllocationRequest(req.id).subscribe({
        next: (res: any) => {
          this.triggerToast(`Request #${req.id} approved successfully!`);
          this.loadData();
        },
        error: (err: any) => {
          console.error('Error approving request:', err);
          const msg = err.error?.message || 'Failed to approve request.';
          alert(msg);
        },
      });
    }
  }

  onRejectRequest(req: BranchAllocationRequestRecord): void {
    if (confirm(`Reject request #${req.id} (${req.branchName})?`)) {
      this.service.rejectAllocationRequest(req.id).subscribe({
        next: (res: any) => {
          this.triggerToast(`Request #${req.id} rejected.`);
          this.loadData();
        },
        error: (err: any) => {
          console.error('Error rejecting request:', err);
          alert('Failed to reject request.');
        },
      });
    }
  }

  // Admin Action: Assign Data Directly to Branch
  onOpenAssignBranchModal(): void {
    this.assignBranchId.set('');
    this.assignBranchCategory.set('BASE');
    this.assignBranchQuantity.set(null);
    this.isAssignBranchModalOpen.set(true);
  }

  closeAssignBranchModal(): void {
    this.isAssignBranchModalOpen.set(false);
  }

  onSubmitAssignBranch(): void {
    const branchId = Number(this.assignBranchId());
    const category = this.assignBranchCategory();
    const qty = this.assignBranchQuantity();

    if (!branchId) {
      alert('Please select a Branch.');
      return;
    }
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.createAllocationRequest(category, qty, branchId).subscribe({
      next: (res: any) => {
        const reqId = res.data?.id;
        if (reqId) {
          this.service.approveAllocationRequest(reqId).subscribe({
            next: () => {
              this.isSubmitting.set(false);
              this.closeAssignBranchModal();
              this.triggerToast(`${qty} ${category === 'BASE' ? 'Base' : 'Non Base'} numbers assigned directly to branch!`);
              this.loadData();
            },
            error: (err: any) => {
              this.isSubmitting.set(false);
              console.error('Error approving direct branch assignment:', err);
              alert(err.error?.message || 'Request created but auto-approval failed.');
              this.loadData();
            },
          });
        } else {
          this.isSubmitting.set(false);
          this.closeAssignBranchModal();
          this.triggerToast('Allocation request created for branch.');
          this.loadData();
        }
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error creating branch allocation:', err);
        alert(err.error?.message || 'Failed to assign numbers to branch.');
      },
    });
  }
}

