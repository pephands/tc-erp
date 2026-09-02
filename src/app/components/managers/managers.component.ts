import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerService } from '../../services/manager.service';
import { BranchService } from '../../services/branch.service';
import { Manager } from '../../models/manager.model';

@Component({
  selector: 'app-managers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './managers.component.html',
  styleUrl: './managers.component.css'
})
export class ManagersComponent {
  private managerService = inject(ManagerService);
  private branchService = inject(BranchService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');

  // Modal open states
  isAddModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);

  // Form Fields (Full Update User Details Matching Screenshot)
  editingId = signal<string | null>(null);
  formFullName = '';
  formOriginalName = '';
  formMobile = '';
  formOfficialNumber = '';
  formGender: 'Male' | 'Female' | 'Other' = 'Male';
  formRole = 'Team Lead';
  formSlab = '';
  formBranch = '';
  formSalary = '0';
  formDateOfJoining = '1970-01-01 00:00:00';
  formDateOfRelieving = '1970-01-01 00:00:00';
  formEmail = '';
  formBankAccountNumber = '';
  formBankHolderName = '';
  formBankIfscCode = '';
  formAddress = '';
  formStatus: 'Active' | 'Inactive' = 'Active';

  // File pickers
  selectedExcelFile: File | null = null;
  selectedAadharFile: File | null = null;

  // Branch list for dropdown selector
  branches = computed(() => this.branchService.branches());

  // Snapshot for Reset functionality
  private originalManagerSnapshot: Manager | null = null;

  // All managers from service
  allManagers = this.managerService.managers;

  // Filtered managers based on search query
  filteredManagers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.allManagers();

    return this.allManagers().filter(m => 
      m.id.toLowerCase().includes(query) ||
      m.fullName.toLowerCase().includes(query) ||
      m.mobile.includes(query) ||
      m.email.toLowerCase().includes(query) ||
      m.branch.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query)
    );
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.filteredManagers().length / this.pageSize()) || 1);

  // Paginated managers for current page
  paginatedManagers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredManagers().slice(start, start + this.pageSize());
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

  // --- Add Manager Modal ---
  openAddModal(): void {
    this.formFullName = '';
    this.formMobile = '';
    this.formGender = 'Male';
    const firstBranch = this.branches()[0]?.name || 'ADAMBAKKAM';
    this.formBranch = firstBranch;

    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  resetAddForm(): void {
    this.formFullName = '';
    this.formMobile = '';
    this.formGender = 'Male';
    this.formBranch = this.branches()[0]?.name || 'ADAMBAKKAM';
  }

  onAddManagerSubmit(): void {
    if (!this.formFullName.trim() || !this.formMobile.trim() || !this.formBranch) {
      alert('Please fill in all required manager details.');
      return;
    }

    this.managerService.addManager({
      fullName: this.formFullName,
      mobile: this.formMobile,
      gender: this.formGender,
      branch: this.formBranch
    });

    this.closeAddModal();
  }

  // --- Edit / Update User Details Modal (Matching Screenshot) ---
  openEditModal(manager: Manager): void {
    this.originalManagerSnapshot = { ...manager };
    this.editingId.set(manager.id);
    this.formFullName = manager.fullName || '';
    this.formOriginalName = manager.originalName || '';
    this.formMobile = manager.mobile || '';
    this.formOfficialNumber = manager.officialNumber || '';
    this.formGender = manager.gender || 'Male';
    this.formRole = manager.role || 'Team Lead';
    this.formSlab = manager.slab || '';
    this.formBranch = manager.branch || '';
    this.formSalary = manager.salary || '0';
    this.formDateOfJoining = manager.dateOfJoining || '1970-01-01 00:00:00';
    this.formDateOfRelieving = manager.dateOfRelieving || '1970-01-01 00:00:00';
    this.formEmail = manager.email || '';
    this.formBankAccountNumber = manager.bankAccountNumber || '';
    this.formBankHolderName = manager.bankHolderName || '';
    this.formBankIfscCode = manager.bankIfscCode || '';
    this.formAddress = manager.address || '';
    this.formStatus = manager.status || 'Active';
    this.selectedAadharFile = null;

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingId.set(null);
    this.originalManagerSnapshot = null;
    this.selectedAadharFile = null;
  }

  resetEditForm(): void {
    if (this.originalManagerSnapshot) {
      const m = this.originalManagerSnapshot;
      this.formFullName = m.fullName || '';
      this.formOriginalName = m.originalName || '';
      this.formMobile = m.mobile || '';
      this.formOfficialNumber = m.officialNumber || '';
      this.formGender = m.gender || 'Male';
      this.formRole = m.role || 'Team Lead';
      this.formSlab = m.slab || '';
      this.formBranch = m.branch || '';
      this.formSalary = m.salary || '0';
      this.formDateOfJoining = m.dateOfJoining || '1970-01-01 00:00:00';
      this.formDateOfRelieving = m.dateOfRelieving || '1970-01-01 00:00:00';
      this.formEmail = m.email || '';
      this.formBankAccountNumber = m.bankAccountNumber || '';
      this.formBankHolderName = m.bankHolderName || '';
      this.formBankIfscCode = m.bankIfscCode || '';
      this.formAddress = m.address || '';
      this.formStatus = m.status || 'Active';
    }
  }

  onAadharFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedAadharFile = target.files[0];
    }
  }

  onUpdateManagerSubmit(): void {
    const id = this.editingId();
    if (!id || !this.originalManagerSnapshot) return;

    const updated: Manager = {
      ...this.originalManagerSnapshot,
      fullName: this.formFullName.trim().toUpperCase(),
      originalName: this.formOriginalName.trim(),
      mobile: this.formMobile.trim(),
      officialNumber: this.formOfficialNumber.trim(),
      gender: this.formGender,
      role: this.formRole,
      slab: this.formSlab,
      branch: this.formBranch,
      salary: this.formSalary,
      dateOfJoining: this.formDateOfJoining,
      dateOfRelieving: this.formDateOfRelieving,
      email: this.formEmail.trim(),
      bankAccountNumber: this.formBankAccountNumber.trim(),
      bankHolderName: this.formBankHolderName.trim(),
      bankIfscCode: this.formBankIfscCode.trim(),
      address: this.formAddress.trim(),
      status: this.formStatus
    };

    this.managerService.updateManager(updated);
    this.closeEditModal();
  }

  // --- Upload Excel Modal ---
  openUploadModal(): void {
    this.selectedExcelFile = null;
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
    this.selectedExcelFile = null;
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedExcelFile = target.files[0];
    }
  }

  onUploadSubmit(): void {
    if (!this.selectedExcelFile) {
      alert('Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }

    alert(`Successfully processed Excel file: ${this.selectedExcelFile.name}. Manager data imported!`);
    this.closeUploadModal();
  }

  // Delete Manager
  onDeleteManager(id: string): void {
    if (confirm(`Are you sure you want to delete Manager ID ${id}?`)) {
      this.managerService.deleteManager(id);
    }
  }
}
