import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { TelecallerService } from '../../services/telecaller.service';
import { Telecaller } from '../../models/telecaller.model';

@Component({
  selector: 'app-telecallers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './telecallers.component.html',
  styleUrl: './telecallers.component.css'
})
export class TelecallersComponent {
  private branchService = inject(BranchListService);
  private telecallerService = inject(TelecallerService);

  // Filter dropdown selections
  selectedBranch = signal<string>('');
  selectedLoginTime = signal<string>('');
  selectedLogOffTime = signal<string>('');

  // Mandatory Filter State Flag
  isFilterApplied = signal<boolean>(false);

  // Table search & Pagination state
  selectedSearchOption = signal<string>('name');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Modals state
  selectedAadharTelecaller = signal<Telecaller | null>(null);
  isEditModalOpen = signal<boolean>(false);
  isAddModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  editingId = signal<string | null>(null);

  // --- Excel Upload File State ---
  selectedExcelFile: File | null = null;

  // --- Add TeleCaller Form Fields ---
  addFullName = '';
  addOriginalName = '';
  addMobile = '';
  addOfficialNumber = '';
  addGender: 'Female' | 'Male' | 'Other' = 'Male';
  addSlab = '';
  addBranch = '';
  addSalary = '';
  addDateOfJoining = '';
  addDateOfRelieving = '';
  addBankAccountNumber = '';
  addBankHolderName = '';
  addBankIfscCode = '';
  addAddress = '';
  selectedAddAadharFile: File | null = null;

  // --- Edit TeleCaller Form Fields ---
  formFullName = '';
  formOriginalName = '';
  formMobile = '';
  formOfficialNumber = '';
  formGender: 'Female' | 'Male' = 'Female';
  formRole = 'Tele Caller';
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
  selectedEditAadharFile: File | null = null;

  private originalTelecallerSnapshot: Telecaller | null = null;

  // Branch options
  branches = signal<any[]>([]);

  constructor() {
    this.branchService.getData().subscribe({
      next: (res: any) => {
        if (res.status === 'success' || (Array.isArray(res) || res.data)) {
            const data = Array.isArray(res) ? res : (res.data || []);
            this.branches.set(data);
        }
      }
    });
  }

  // Time slot options
  loginTimeSlots: string[] = [
    '06:00 AM',
    '07:00 AM',
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '11:00 AM'
  ];

  logOffTimeSlots: string[] = [
    '06:00 PM',
    '07:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM',
    '11:00 PM'
  ];

  // All telecallers from service
  allTelecallers = this.telecallerService.telecallers;

  // Filtered Telecallers (Only loaded if isFilterApplied is true)
  filteredTelecallers = computed(() => {
    if (!this.isFilterApplied()) {
      return [];
    }

    const branchFilter = this.selectedBranch();
    const loginFilter = this.selectedLoginTime();
    const logOffFilter = this.selectedLogOffTime();
    const query = this.searchQuery().trim().toLowerCase();
    const searchScope = this.selectedSearchOption();

    return this.allTelecallers().filter(t => {
      // Filter 1: Branch
      if (branchFilter && t.branch.toUpperCase() !== branchFilter.toUpperCase()) {
        return false;
      }
      // Filter 2: Login Time
      if (loginFilter && t.loginTime !== loginFilter) {
        return false;
      }
      // Filter 3: LogOff Time
      if (logOffFilter && t.logOffTime !== logOffFilter) {
        return false;
      }

      // Search Query Filter
      if (query) {
        if (searchScope === 'id' && !t.id.toLowerCase().includes(query)) {
          return false;
        }
        if (searchScope === 'name' && !t.fullName.toLowerCase().includes(query) && !(t.originalName && t.originalName.toLowerCase().includes(query))) {
          return false;
        }
        if (searchScope === 'personalNo' && !t.personalNo.includes(query)) {
          return false;
        }
        if (searchScope === 'officialNo' && !(t.officialNo && t.officialNo.includes(query))) {
          return false;
        }
      }

      return true;
    });
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.filteredTelecallers().length / this.pageSize()) || 1);

  // Paginated records for current page
  paginatedTelecallers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredTelecallers().slice(start, start + this.pageSize());
  });

  // Page Numbers Array (1, 2, 3, 4, 5, 6...)
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  // Apply Filters Action
  onApplyFilters(): void {
    if (!this.selectedBranch() && !this.selectedLoginTime() && !this.selectedLogOffTime()) {
      alert('Please select at least one filter (Branch, Login Time, or LogOff Time) before applying.');
      return;
    }
    this.isFilterApplied.set(true);
    this.currentPage.set(1);
  }

  // Clear / Reset Filters
  onResetFilters(): void {
    this.selectedBranch.set('');
    this.selectedLoginTime.set('');
    this.selectedLogOffTime.set('');
    this.searchQuery.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
  }

  // Pagination Handlers
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

  lastPage(): void {
    this.currentPage.set(this.totalPages());
  }

  firstPage(): void {
    this.currentPage.set(1);
  }

  // --- UPLOAD TELECALLER EDIT DATA MODAL HANDLERS ---
  onUploadData(): void {
    this.selectedExcelFile = null;
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
    this.selectedExcelFile = null;
  }

  onExcelFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedExcelFile = target.files[0];
    }
  }

  onUploadExcelSubmit(): void {
    if (!this.selectedExcelFile) {
      alert('Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }

    alert(`Successfully processed Excel file: ${this.selectedExcelFile.name}. TeleCaller edit data updated!`);
    this.closeUploadModal();
  }

  // --- ADD NEW TELECALLER MODAL HANDLERS ---
  onAddNew(): void {
    this.resetAddForm();
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
    this.resetAddForm();
  }

  resetAddForm(): void {
    this.addFullName = '';
    this.addOriginalName = '';
    this.addMobile = '';
    this.addOfficialNumber = '';
    this.addGender = 'Male';
    this.addSlab = '';
    this.addBranch = this.branches()[0]?.name || 'ADAMBAKKAM';
    this.addSalary = '';
    this.addDateOfJoining = '';
    this.addDateOfRelieving = '';
    this.addBankAccountNumber = '';
    this.addBankHolderName = '';
    this.addBankIfscCode = '';
    this.addAddress = '';
    this.selectedAddAadharFile = null;
  }

  onAddAadharSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedAddAadharFile = target.files[0];
    }
  }

  onAddTelecallerSubmit(): void {
    if (!this.addFullName.trim() || !this.addMobile.trim() || !this.addBranch) {
      alert('Please fill in required fields (Full name, Mobile Number, Branch).');
      return;
    }

    const nextIdNum = this.allTelecallers().length + 130;
    const newId = `ADM_${nextIdNum}`;

    const newTelecaller: Telecaller = {
      id: newId,
      fullName: this.addFullName.trim().toUpperCase(),
      originalName: this.addOriginalName.trim(),
      personalNo: this.addMobile.trim(),
      officialNo: this.addOfficialNumber.trim(),
      gender: this.addGender === 'Other' ? 'Female' : this.addGender,
      role: 'Tele Caller',
      slab: this.addSlab.trim(),
      branch: this.addBranch,
      salary: this.addSalary.trim() || '0',
      dateOfJoining: this.addDateOfJoining.trim() || '1970-01-01 00:00:00',
      dateOfRelieving: this.addDateOfRelieving.trim() || '1970-01-01 00:00:00',
      bankAccountNumber: this.addBankAccountNumber.trim(),
      bankHolderName: this.addBankHolderName.trim(),
      bankIfscCode: this.addBankIfscCode.trim(),
      address: this.addAddress.trim(),
      status: 'Active',
      loginTime: '09:00 AM',
      logOffTime: '06:00 PM',
      hasAadhar: !!this.selectedAddAadharFile
    };

    const current = this.allTelecallers();
    this.telecallerService.telecallers.set([newTelecaller, ...current]);

    this.isFilterApplied.set(true);
    this.closeAddModal();
  }

  // 1. Tick Mark Action with Warning Dialog
  onActivateClick(telecaller: Telecaller): void {
    const confirmMessage = `WARNING: Are you sure you want to change the status of TeleCaller "${telecaller.fullName}" (ID: ${telecaller.id}) to ACTIVE?`;
    if (confirm(confirmMessage)) {
      this.telecallerService.toggleStatus(telecaller.id);
    }
  }

  // 2. Delete Action with Warning Dialog
  onDeleteClick(telecaller: Telecaller): void {
    const confirmMessage = `WARNING: Are you sure you want to permanently delete TeleCaller "${telecaller.fullName}" (ID: ${telecaller.id})?`;
    if (confirm(confirmMessage)) {
      this.telecallerService.deleteTelecaller(telecaller.id);
    }
  }

  // 3. Edit Action Popup Modal
  openEditModal(telecaller: Telecaller): void {
    this.originalTelecallerSnapshot = { ...telecaller };
    this.editingId.set(telecaller.id);
    this.formFullName = telecaller.fullName || '';
    this.formOriginalName = telecaller.originalName || '';
    this.formMobile = telecaller.personalNo || '';
    this.formOfficialNumber = telecaller.officialNo || '';
    this.formGender = telecaller.gender || 'Female';
    this.formRole = telecaller.role || 'Tele Caller';
    this.formSlab = telecaller.slab || '';
    this.formBranch = telecaller.branch || '';
    this.formSalary = telecaller.salary || '0';
    this.formDateOfJoining = telecaller.dateOfJoining || '1970-01-01 00:00:00';
    this.formDateOfRelieving = telecaller.dateOfRelieving || '1970-01-01 00:00:00';
    this.formEmail = telecaller.email || '';
    this.formBankAccountNumber = telecaller.bankAccountNumber || '';
    this.formBankHolderName = telecaller.bankHolderName || '';
    this.formBankIfscCode = telecaller.bankIfscCode || '';
    this.formAddress = telecaller.address || '';
    this.selectedEditAadharFile = null;

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingId.set(null);
    this.originalTelecallerSnapshot = null;
    this.selectedEditAadharFile = null;
  }

  resetEditForm(): void {
    if (this.originalTelecallerSnapshot) {
      const t = this.originalTelecallerSnapshot;
      this.formFullName = t.fullName || '';
      this.formOriginalName = t.originalName || '';
      this.formMobile = t.personalNo || '';
      this.formOfficialNumber = t.officialNo || '';
      this.formGender = t.gender || 'Female';
      this.formRole = t.role || 'Tele Caller';
      this.formSlab = t.slab || '';
      this.formBranch = t.branch || '';
      this.formSalary = t.salary || '0';
      this.formDateOfJoining = t.dateOfJoining || '1970-01-01 00:00:00';
      this.formDateOfRelieving = t.dateOfRelieving || '1970-01-01 00:00:00';
      this.formEmail = t.email || '';
      this.formBankAccountNumber = t.bankAccountNumber || '';
      this.formBankHolderName = t.bankHolderName || '';
      this.formBankIfscCode = t.bankIfscCode || '';
      this.formAddress = t.address || '';
    }
  }

  onEditAadharSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedEditAadharFile = target.files[0];
    }
  }

  onUpdateTelecallerSubmit(): void {
    const id = this.editingId();
    if (!id || !this.originalTelecallerSnapshot) return;

    const updated: Telecaller = {
      ...this.originalTelecallerSnapshot,
      fullName: this.formFullName.trim().toUpperCase(),
      originalName: this.formOriginalName.trim(),
      personalNo: this.formMobile.trim(),
      officialNo: this.formOfficialNumber.trim(),
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
      hasAadhar: this.selectedEditAadharFile ? true : this.originalTelecallerSnapshot.hasAadhar
    };

    this.telecallerService.updateTelecaller(updated);
    this.closeEditModal();
  }

  // Aadhar Modal Handlers
  openAadharModal(telecaller: Telecaller): void {
    this.selectedAadharTelecaller.set(telecaller);
  }

  closeAadharModal(): void {
    this.selectedAadharTelecaller.set(null);
  }

  onDownloadTelecallers(): void {
    alert('Exporting telecallers list...');
  }
}
