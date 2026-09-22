import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { BranchDeleteService } from '../../services/branch-delete.service';
import { BranchUpdateService } from '../../services/branch-update.service';
import { BranchCreateService } from '../../services/branch-create.service';
import { Branch } from '../../models/branch.model';
import { ToastService } from '../../services/toast.service';
import { AddBranchModalComponent } from '../modals/add-branch-modal/add-branch-modal.component';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBranchModalComponent],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent implements OnInit {
  private branchService = inject(BranchListService);
  private branchDeleteService = inject(BranchDeleteService);
  private branchUpdateService = inject(BranchUpdateService);
  private branchCreateService = inject(BranchCreateService);
  private toastService = inject(ToastService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  searchQuery = signal<string>('');
  statusFilter = signal<string>(''); // '' for all, 'true' for active, 'false' for inactive

  // Modals state
  isModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  selectedBranchForEdit = signal<Branch | undefined>(undefined);
  selectedFile = signal<File | null>(null);
  uploadError = signal<string | null>(null);

  // Edit / Add Form Fields (temporarily re-added to satisfy template bindings)
  formName = '';
  formShortForm = '';
  formPhone = '';
  formAddress = '';
  formIsHidden = false;

  // All branches from service
  allBranches = signal<Branch[]>([]);
  isLoading = signal<boolean>(false);

  // Filtered branches length (from backend total count)
  filteredBranchesLength = computed(() => this.totalItems());

  // Total pages
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  // Paginated branches (now directly from backend)
  paginatedBranches = computed(() => this.allBranches());

  // Page Numbers Array for Pagination Buttons (1, 2, 3...)
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const isActive = this.statusFilter();
    this.branchService.getData(this.currentPage(), this.pageSize(), search, isActive).subscribe({
      next: (res: any) => {
        let data: Branch[] = [];
        if (res && res.status === 'success' && res.data) {
          data = Array.isArray(res.data) ? res.data : [res.data];
          if (res.count !== undefined) {
             this.totalItems.set(res.count);
          } else {
             this.totalItems.set(data.length);
          }
        } else if (Array.isArray(res)) {
          data = res;
          this.totalItems.set(data.length);
        }
        
        this.allBranches.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Error', 'Failed to load branches.');
        this.isLoading.set(false);
      }
    });
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadBranches();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadBranches();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadBranches();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.loadBranches();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadBranches();
  }

  isExporting = signal<boolean>(false);

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.currentPage.set(1);
    this.loadBranches();
  }

  exportToExcel(): void {
    this.isExporting.set(true);
    this.branchService.exportData(this.searchQuery(), this.statusFilter()).subscribe({
      next: (blob: Blob) => {
        this.isExporting.set(false);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'branches_export.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastService.success('Success', 'Branches exported successfully.');
      },
      error: (err: any) => {
        this.isExporting.set(false);
        this.toastService.error('Export Failed', 'Failed to export branches. Please try again.');
      }
    });
  }

  openEditModal(branch: Branch): void {
    this.selectedBranchForEdit.set(branch);
    this.isModalOpen.set(true);
  }

  resetEditForm(): void {
    // Reset edit form disabled
  }

  onUpdateBranch(): void {
    this.toastService.info('Notice', 'Edit feature is temporarily disabled while API integration is ongoing.');
  }

  openAddModal(): void {
    this.selectedBranchForEdit.set(undefined);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedBranchForEdit.set(undefined);
  }

  onBranchAdded(): void {
    this.loadBranches();
  }

  onDeleteBranch(id: number): void {
    if (window.confirm('Are you sure you want to deactivate this branch?')) {
      this.branchUpdateService.patchData(id, { is_active: false }).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toastService.success('Deactivated', res.message || 'Branch deactivated successfully.');
            this.loadBranches();
          } else {
            this.toastService.error('Error', 'Failed to deactivate branch.');
          }
        },
        error: (err) => {
          this.toastService.error('API Error', err?.error?.message || 'Server error occurred.');
        }
      });
    }
  }

  onRestoreBranch(id: number): void {
    if (window.confirm('Are you sure you want to reactivate this branch?')) {
      this.branchUpdateService.patchData(id, { is_active: true }).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toastService.success('Restored', res.message || 'Branch reactivated successfully.');
            this.loadBranches();
          } else {
            this.toastService.error('Error', 'Failed to reactivate branch.');
          }
        },
        error: (err) => {
          this.toastService.error('API Error', err?.error?.message || 'Server error occurred.');
        }
      });
    }
  }

  openUploadModal(): void {
    this.isUploadModalOpen.set(true);
    this.selectedFile.set(null);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
    this.selectedFile.set(null);
    this.uploadError.set(null);
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.selectedFile.set(fileList[0]);
    } else {
      this.selectedFile.set(null);
    }
  }

  confirmUpload(): void {
    const file = this.selectedFile();
    if (!file) {
      this.toastService.error('Validation Error', 'Please select a file to upload.');
      return;
    }

    this.isLoading.set(true);
    this.uploadError.set(null);
    this.branchCreateService.uploadFile(file).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.status === 'success') {
          this.toastService.success('Success', res.message || 'Branches uploaded successfully.');
          this.loadBranches();
          this.closeUploadModal();
        } else {
          this.uploadError.set(res.message || 'Failed to upload branches.');
          this.toastService.error('Error', res.message || 'Failed to upload branches.');
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        const errMsg = err?.error?.message || 'Server error occurred during upload.';
        this.uploadError.set(errMsg);
        this.toastService.error('Upload Failed', errMsg);
      }
    });
  }

  downloadSampleFormat(): void {
    const headers = "Branch ID,Branch Name,Branch Code,Branch Address,Phone number,Mail,Latitude,Longitude,Geofence Radius Meters,IP Validation,Location Validation,Branch Active\n";
    const sampleRow = "1,SAMPLE BRANCH,SMP,123 Main St,9876543210,sample@example.com,13.0827,80.2707,200,TRUE,TRUE,TRUE\n";
    const csvContent = headers + sampleRow;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'branch_upload_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
