import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchListService } from '../../services/branch-list.service';
import { TelecallerService } from '../../services/telecaller.service';
import { UserListService } from '../../services/user-list.service';
import { Telecaller } from '../../models/telecaller.model';

import { AddTelecallerModalComponent } from '../modals/add-telecaller-modal/add-telecaller-modal.component';

@Component({
  selector: 'app-telecallers',
  standalone: true,
  imports: [CommonModule, FormsModule, AddTelecallerModalComponent],
  templateUrl: './telecallers.component.html',
  styleUrl: './telecallers.component.css'
})
export class TelecallersComponent {
  private branchService = inject(BranchListService);
  private telecallerService = inject(TelecallerService);
  private userListService = inject(UserListService);

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
  selectedTelecallerToEdit = signal<Telecaller | null>(null);
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
            if (data.length > 0 && !this.selectedBranch()) {
              this.selectedBranch.set(data[0].name);
              this.isFilterApplied.set(true);
              this.fetchTelecallersFromApi();
            }
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
    '05:00 PM',
    '06:00 PM',
    '07:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM',
    '11:00 PM'
  ];

  // All telecallers from service
  allTelecallers = this.telecallerService.telecallers;

  // Filtered Telecallers
  filteredTelecallers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const searchScope = this.selectedSearchOption();

    return this.allTelecallers().filter(t => {
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

  // Instant Filter Change Handlers
  onBranchChange(branch: string): void {
    this.selectedBranch.set(branch);
    this.isFilterApplied.set(true);
    this.currentPage.set(1);
    this.fetchTelecallersFromApi();
  }

  onLoginTimeChange(loginTime: string): void {
    this.selectedLoginTime.set(loginTime);
    this.isFilterApplied.set(true);
    this.currentPage.set(1);
    this.fetchTelecallersFromApi();
  }

  onLogOffTimeChange(logOffTime: string): void {
    this.selectedLogOffTime.set(logOffTime);
    this.isFilterApplied.set(true);
    this.currentPage.set(1);
    this.fetchTelecallersFromApi();
  }

  // Clear / Reset Filters
  onResetFilters(): void {
    const defaultBranch = this.branches().length > 0 ? this.branches()[0].name : '';
    this.selectedBranch.set(defaultBranch);
    this.selectedLoginTime.set('');
    this.selectedLogOffTime.set('');
    this.searchQuery.set('');
    this.isFilterApplied.set(true);
    this.currentPage.set(1);
    this.fetchTelecallersFromApi();
  }

  fetchTelecallersFromApi(): void {
    const branch = this.selectedBranch();
    const loginTime = this.selectedLoginTime();
    const logOffTime = this.selectedLogOffTime();
    const search = this.searchQuery().trim();

    this.userListService.getTelecallers(branch, loginTime, logOffTime, 1, 100, search).subscribe({
      next: (res: any) => {
        let results: any[] = [];
        if (res && res.results) {
          results = res.results;
        } else if (Array.isArray(res)) {
          results = res;
        } else if (res && res.data) {
          results = Array.isArray(res.data) ? res.data : [res.data];
        }

        const mapped = results.map((u: any) => this.mapApiUserToTelecaller(u));
        this.telecallerService.telecallers.set(mapped);
      },
      error: (err: any) => {
        console.error('Error fetching telecallers:', err);
      }
    });
  }

  private mapApiUserToTelecaller(u: any): Telecaller {
    return {
      id: u.username || `TC_${u.id}`,
      fullName: u.full_name || u.username || '',
      originalName: u.full_name || '',
      personalNo: u.phone || u.username || '',
      officialNo: u.office_phone || '',
      gender: u.gender === 'Female' ? 'Female' : 'Male',
      role: u.roles?.[0]?.name || 'Tele Caller',
      slab: u.slab || '',
      salary: u.salary || '0',
      dateOfJoining: u.date_of_joining || '',
      dateOfRelieving: u.date_of_relieving || '',
      email: u.email || '',
      bankAccountNumber: u.bank_account_number || '',
      bankHolderName: u.bank_holder_name || '',
      bankIfscCode: u.bank_ifsc_code || '',
      address: u.address || '',
      status: u.status || (u.is_active ? 'Active' : 'InActive'),
      branch: u.branch?.name || '',
      loginTime: this.formatTime12h(u.shift_start_time) || '09:00 AM',
      logOffTime: this.formatTime12h(u.shift_end_time) || '06:00 PM',
      hasAadhar: !!u.aadhar_image
    };
  }

  private formatTime12h(timeStr?: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours < 10 ? '0' + hours : '' + hours;
    return `${strHours}:${minutes} ${ampm}`;
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
    this.selectedTelecallerToEdit.set(null);
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
    this.selectedTelecallerToEdit.set(null);
  }

  // --- EDIT TELECALLER MODAL HANDLERS ---
  openEditModal(telecaller: Telecaller): void {
    this.selectedTelecallerToEdit.set(telecaller);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedTelecallerToEdit.set(null);
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
