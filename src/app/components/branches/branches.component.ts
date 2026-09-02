import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchService } from '../../services/branch.service';
import { Branch } from '../../models/branch.model';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent {
  private branchService = inject(BranchService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');

  // Edit / Add Modal state
  isEditModalOpen = signal<boolean>(false);
  isAddModalOpen = signal<boolean>(false);

  // Edit Form Fields
  editingId = signal<number | null>(null);
  formName = '';
  formShortForm = '';
  formPhone = '';
  formAddress = '';
  formIsHidden = false;

  // Original snapshot for Reset functionality
  private originalBranchSnapshot: Branch | null = null;

  // All branches from service
  allBranches = this.branchService.branches;

  // Filtered branches based on search query
  filteredBranches = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.allBranches();

    return this.allBranches().filter(b => 
      b.name.toLowerCase().includes(query) ||
      b.shortForm.toLowerCase().includes(query) ||
      b.phone.includes(query) ||
      b.address.toLowerCase().includes(query)
    );
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.filteredBranches().length / this.pageSize()) || 1);

  // Paginated branches for current page
  paginatedBranches = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBranches().slice(start, start + this.pageSize());
  });

  // Page Numbers Array for Pagination Buttons (1, 2, 3...)
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
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
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  // Open Edit Modal Popup with branch details
  openEditModal(branch: Branch): void {
    this.originalBranchSnapshot = { ...branch };
    this.editingId.set(branch.id);
    this.formName = branch.name;
    this.formShortForm = branch.shortForm;
    this.formPhone = branch.phone;
    this.formAddress = branch.address;
    this.formIsHidden = branch.isHidden;

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingId.set(null);
    this.originalBranchSnapshot = null;
  }

  // Reset form to original branch snapshot
  resetEditForm(): void {
    if (this.originalBranchSnapshot) {
      this.formName = this.originalBranchSnapshot.name;
      this.formShortForm = this.originalBranchSnapshot.shortForm;
      this.formPhone = this.originalBranchSnapshot.phone;
      this.formAddress = this.originalBranchSnapshot.address;
      this.formIsHidden = this.originalBranchSnapshot.isHidden;
    }
  }

  // Submit Update
  onUpdateBranch(): void {
    const id = this.editingId();
    if (id === null) return;

    const updated: Branch = {
      id,
      name: this.formName.trim().toUpperCase(),
      shortForm: this.formShortForm.trim().toUpperCase(),
      phone: this.formPhone.trim(),
      address: this.formAddress.trim() || 'NA',
      isHidden: this.formIsHidden
    };

    this.branchService.updateBranch(updated);
    this.closeEditModal();
  }

  // Open Add Modal
  openAddModal(): void {
    this.formName = '';
    this.formShortForm = '';
    this.formPhone = '';
    this.formAddress = '';
    this.formIsHidden = false;

    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  // Submit Add
  onAddBranch(): void {
    if (!this.formName.trim() || !this.formShortForm.trim()) {
      return;
    }

    this.branchService.addBranch({
      name: this.formName.trim().toUpperCase(),
      shortForm: this.formShortForm.trim().toUpperCase(),
      phone: this.formPhone.trim() || 'NA',
      address: this.formAddress.trim() || 'NA',
      isHidden: this.formIsHidden
    });

    this.closeAddModal();
  }

  // Delete Branch
  onDeleteBranch(id: number): void {
    if (confirm(`Are you sure you want to delete branch ID ${id}?`)) {
      this.branchService.deleteBranch(id);
    }
  }
}
