import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { BranchDeleteService } from '../../services/branch-delete.service';
import { BranchUpdateService } from '../../services/branch-update.service';
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
  private toastService = inject(ToastService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  searchQuery = signal<string>('');

  // Modals state
  isModalOpen = signal<boolean>(false);
  selectedBranchForEdit = signal<Branch | undefined>(undefined);

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
    this.branchService.getData(this.currentPage(), this.pageSize(), search).subscribe({
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

  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadBranches();
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
      this.branchDeleteService.deleteData(id).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toastService.success('Deleted', res.message || 'Branch deactivated successfully.');
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
      this.branchUpdateService.patchData(id, { status: 'Active' }).subscribe({
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
}
