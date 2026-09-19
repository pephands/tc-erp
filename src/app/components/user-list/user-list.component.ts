import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../services/user-list.service';
import { BranchListService } from '../../services/branch-list.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

export interface UserRecord {
  id: string;
  dbId: number;
  fullName: string;
  originalName: string;
  personalNo: string;
  officialNo: string;
  gender: 'Female' | 'Male' | 'Other';
  role: string;
  roleCode: string;
  slab: string;
  salary: string;
  dateOfJoining: string;
  dateOfRelieving: string;
  dateOfRejoining: string;
  email: string;
  bankAccountNumber: string;
  bankHolderName: string;
  bankIfscCode: string;
  address: string;
  status: string;
  branch: string;
  branchId?: number;
  loginTime: string;
  logOffTime: string;
  hasAadhar: boolean;
  aadharImage?: string;
  managedBranches?: any[];
  managedBranchIds?: number[];
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  private userListService = inject(UserListService);
  private branchService = inject(BranchListService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  @Input() roleCode: string = 'TC';
  @Input() roleTitle: string = 'User';
  @Input() roleIcon: string = 'group';
  @Input() roleDescription: string = 'Manage and view all registered users.';

  get isTlUser(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('TL') && !roles.includes('ADMIN');
  }

  get isAdminUser(): boolean {
    return this.authService.userRoles().includes('ADMIN');
  }

  get userBranchName(): string {
    return this.authService.currentUser()?.branch?.name || '';
  }

  // Data & Loading States
  users = signal<UserRecord[]>([]);
  isLoading = signal<boolean>(false);
  branches = signal<any[]>([]);

  // Filter Bar Signals
  selectedBranch = signal<string>('');
  selectedStatus = signal<string>('');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  // Modals state
  isAddModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  selectedAadharUser = signal<UserRecord | null>(null);
  editingUser = signal<UserRecord | null>(null);

  // Form Fields - Add & Edit
  formEmployeeId = '';
  formFullName = '';
  formMobile = '';
  formOfficialPhone = '';
  formEmail = '';
  formBranchId = '';
  formGender: 'Male' | 'Female' | 'Other' = 'Male';
  formSlab = '';
  formSalary = '0';
  formShiftStart = '09:00 AM';
  formShiftEnd = '06:00 PM';
  formDateOfJoining = '';
  formDateOfRelieving = '';
  formDateOfRejoining = '';
  formBankAccountNumber = '';
  formBankHolderName = '';
  formBankIfscCode = '';
  formAddress = '';
  formStatus = 'Active';
  formManagedBranchIds: number[] = [];
  isManagedBranchDropdownOpen = signal<boolean>(false);
  branchSearchText = signal<string>('');
  selectedAadharFile: File | null = null;
  selectedExcelFile: File | null = null;
  isSubmittingForm = signal<boolean>(false);

  slabOptions: string[] = ['SLAB-1', 'SLAB-2', 'SLAB-3', 'SLAB-4', 'SLAB-5'];

  shiftTimeSlots: string[] = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
  ];

  ngOnInit(): void {
    if (!this.isAdminUser && this.userBranchName) {
      this.selectedBranch.set(this.userBranchName);
      this.branches.set([{ id: 'self', name: this.userBranchName }]);
    } else {
      this.loadBranches();
    }
    this.fetchUsers();
  }

  loadBranches(): void {
    this.branchService.getData().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data || res.results || []);
        this.branches.set(data);
      }
    });
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    let branch = this.selectedBranch();
    if (!this.isAdminUser && !branch) {
      branch = this.userBranchName;
    }

    const search = this.searchQuery().trim();
    const page = this.currentPage();

    this.userListService.getRoleUsers(this.roleCode, branch, null, null, page, this.pageSize(), search).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        let count = 0;

        if (res && res.results) {
          items = res.results;
          count = res.count || items.length;
        } else if (Array.isArray(res)) {
          items = res;
          count = items.length;
        } else if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
          count = items.length;
        }

        const mapped = items.map((u: any) => this.mapApiUserToRecord(u));

        // Client-side status filter if specified
        let filtered = mapped;
        if (this.selectedStatus()) {
          filtered = mapped.filter(u => u.status.toLowerCase() === this.selectedStatus().toLowerCase());
        }

        this.users.set(filtered);
        this.totalCount.set(count || filtered.length);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(`Error fetching ${this.roleTitle} users:`, err);
        this.isLoading.set(false);
      }
    });
  }

  private mapApiUserToRecord(u: any): UserRecord {
    const primaryRole = u.roles?.[0];
    return {
      id: u.username || `EMP_${u.id}`,
      dbId: u.id,
      fullName: u.full_name || u.username || '',
      originalName: u.full_name || '',
      personalNo: u.phone || u.username || '',
      officialNo: u.office_phone || '',
      gender: u.gender === 'Female' ? 'Female' : 'Male',
      role: primaryRole?.name || this.roleTitle,
      roleCode: primaryRole?.code || this.roleCode,
      slab: u.slab || '',
      salary: u.salary || '0',
      dateOfJoining: u.date_of_joining ? u.date_of_joining.slice(0, 10) : '',
      dateOfRelieving: u.date_of_relieving ? u.date_of_relieving.slice(0, 10) : '',
      dateOfRejoining: u.date_of_rejoining ? u.date_of_rejoining.slice(0, 10) : '',
      email: u.email || '',
      bankAccountNumber: u.bank_account_number || '',
      bankHolderName: u.bank_holder_name || '',
      bankIfscCode: u.bank_ifsc_code || '',
      address: u.address || '',
      status: u.status || (u.is_active ? 'Active' : 'Inactive'),
      branch: u.branch?.name || '',
      branchId: u.branch?.id,
      loginTime: this.formatTime12h(u.shift_start_time) || '09:00 AM',
      logOffTime: this.formatTime12h(u.shift_end_time) || '06:00 PM',
      hasAadhar: !!u.aadhar_image,
      aadharImage: u.aadhar_image,
      managedBranches: u.managed_branches || [],
      managedBranchIds: (u.managed_branches || []).map((b: any) => b.id)
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

  // Filter Handlers
  onBranchChange(val: string): void {
    this.selectedBranch.set(val);
    this.currentPage.set(1);
    this.fetchUsers();
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.currentPage.set(1);
    this.fetchUsers();
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
    this.fetchUsers();
  }

  onResetFilters(): void {
    if (this.isAdminUser) {
      this.selectedBranch.set('');
    }
    this.selectedStatus.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.fetchUsers();
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchUsers();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchUsers();
    }
  }

  // Add User Modal Handlers
  openAddModal(): void {
    this.resetForm();
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  // Edit User Modal Handlers
  openEditModal(user: UserRecord): void {
    this.editingUser.set(user);
    this.formEmployeeId = user.id;
    this.formFullName = user.fullName;
    this.formMobile = user.personalNo;
    this.formOfficialPhone = user.officialNo;
    this.formEmail = user.email;
    this.formBranchId = user.branchId ? user.branchId.toString() : '';
    this.formGender = user.gender;
    
    let slabVal = user.slab ? user.slab.trim() : '';
    if (slabVal) {
      const matched = this.slabOptions.find(s => s.toLowerCase() === slabVal.toLowerCase() || s.replace('-', ' ').toLowerCase() === slabVal.toLowerCase());
      if (matched) {
        slabVal = matched;
      }
    }
    this.formSlab = slabVal;
    this.formSalary = user.salary;
    this.formShiftStart = user.loginTime || '09:00 AM';
    this.formShiftEnd = user.logOffTime || '06:00 PM';
    this.formDateOfJoining = user.dateOfJoining;
    this.formDateOfRelieving = user.dateOfRelieving;
    this.formDateOfRejoining = user.dateOfRejoining;
    this.formBankAccountNumber = user.bankAccountNumber;
    this.formBankHolderName = user.bankHolderName;
    this.formBankIfscCode = user.bankIfscCode;
    this.formAddress = user.address;
    this.formStatus = user.status;
    this.formManagedBranchIds = user.managedBranchIds ? [...user.managedBranchIds] : [];
    this.isManagedBranchDropdownOpen.set(false);
    this.branchSearchText.set('');
    this.selectedAadharFile = null;
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingUser.set(null);
  }

  resetForm(): void {
    this.formEmployeeId = '';
    this.formFullName = '';
    this.formMobile = '';
    this.formOfficialPhone = '';
    this.formEmail = '';
    this.formBranchId = '';
    this.formGender = 'Male';
    this.formSlab = '';
    this.formSalary = '0';
    this.formShiftStart = '09:00 AM';
    this.formShiftEnd = '06:00 PM';
    this.formDateOfJoining = '';
    this.formDateOfRelieving = '';
    this.formDateOfRejoining = '';
    this.formBankAccountNumber = '';
    this.formBankHolderName = '';
    this.formBankIfscCode = '';
    this.formAddress = '';
    this.formStatus = 'Active';
    this.formManagedBranchIds = [];
    this.isManagedBranchDropdownOpen.set(false);
    this.branchSearchText.set('');
    this.selectedAadharFile = null;
  }

  toggleManagedBranch(branchId: number): void {
    const idx = this.formManagedBranchIds.indexOf(branchId);
    if (idx > -1) {
      this.formManagedBranchIds.splice(idx, 1);
    } else {
      this.formManagedBranchIds.push(branchId);
    }
  }

  isManagedBranchSelected(branchId: number): boolean {
    return this.formManagedBranchIds.includes(branchId);
  }

  toggleBranchDropdown(): void {
    this.isManagedBranchDropdownOpen.update(v => !v);
  }

  closeBranchDropdown(): void {
    this.isManagedBranchDropdownOpen.set(false);
  }

  onBranchSearchInput(val: string): void {
    this.branchSearchText.set(val);
  }

  getAvailableBranchesForSelection(): any[] {
    const homeId = this.formBranchId;
    return this.branches().filter(b => b.id !== 'self' && b.id.toString() !== homeId);
  }

  getFilteredBranchesForSelection(): any[] {
    const available = this.getAvailableBranchesForSelection();
    const query = this.branchSearchText().toLowerCase().trim();
    if (!query) return available;
    return available.filter(b => 
      (b.name && b.name.toLowerCase().includes(query)) || 
      (b.code && b.code.toLowerCase().includes(query))
    );
  }

  getSelectedBranchPills(): { id: number; name: string }[] {
    const all = this.branches();
    return this.formManagedBranchIds.map(id => {
      const b = all.find((item: any) => item.id === id || item.id === Number(id));
      return { id: Number(id), name: b ? b.name : `Branch #${id}` };
    });
  }

  selectAllBranches(): void {
    const available = this.getAvailableBranchesForSelection();
    this.formManagedBranchIds = available.map(b => b.id);
  }

  clearAllBranches(): void {
    this.formManagedBranchIds = [];
  }

  removeManagedBranch(branchId: number): void {
    const idx = this.formManagedBranchIds.indexOf(branchId);
    if (idx > -1) {
      this.formManagedBranchIds.splice(idx, 1);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedAadharFile = file;
    }
  }

  onSubmitAddUser(): void {
    if (!this.formFullName.trim()) {
      this.toastService.error('Validation Error', 'Full Name is required.');
      return;
    }
    if (!this.formMobile.trim()) {
      this.toastService.error('Validation Error', 'Mobile number is required.');
      return;
    }

    this.isSubmittingForm.set(true);
    const formData = new FormData();
    const usernameVal = this.formEmployeeId.trim() || this.formMobile.trim();
    formData.append('username', usernameVal);
    formData.append('full_name', this.formFullName.trim());
    formData.append('phone', this.formMobile.trim());
    formData.append('password', 'Welcome@123');
    formData.append('gender', this.formGender);
    formData.append('status', this.formStatus);
    formData.append('target_role', this.roleCode);

    if (this.formOfficialPhone.trim()) formData.append('office_phone', this.formOfficialPhone.trim());
    if (this.formEmail.trim()) formData.append('email', this.formEmail.trim());
    if (this.formBranchId) formData.append('branch_id', this.formBranchId);
    if (this.formSlab.trim()) formData.append('slab', this.formSlab.trim());
    if (this.formSalary.trim()) formData.append('salary', this.formSalary.trim());
    if (this.formDateOfJoining) formData.append('date_of_joining', this.formDateOfJoining);
    if (this.formDateOfRelieving) formData.append('date_of_relieving', this.formDateOfRelieving);
    if (this.formDateOfRejoining) formData.append('date_of_rejoining', this.formDateOfRejoining);
    if (this.formBankAccountNumber.trim()) formData.append('bank_account_number', this.formBankAccountNumber.trim());
    if (this.formBankHolderName.trim()) formData.append('bank_holder_name', this.formBankHolderName.trim());
    if (this.formBankIfscCode.trim()) formData.append('bank_ifsc_code', this.formBankIfscCode.trim());
    if (this.formAddress.trim()) formData.append('address', this.formAddress.trim());
    if (this.selectedAadharFile) formData.append('aadhar_image', this.selectedAadharFile);
    if (this.roleCode === 'MANAGER') {
      if (this.formManagedBranchIds.length > 0) {
        this.formManagedBranchIds.forEach(id => formData.append('managed_branch_ids', id.toString()));
      }
    }

    this.userListService.addUser(formData).subscribe({
      next: (res: any) => {
        this.isSubmittingForm.set(false);
        this.toastService.success('Success', `${this.roleTitle} user created successfully!`);
        this.closeAddModal();
        this.fetchUsers();
      },
      error: (err: any) => {
        console.error('Error adding user:', err);
        this.isSubmittingForm.set(false);
        const msg = err.error?.message || err.error?.detail || 'Failed to create user. Check if Employee ID or mobile number is already registered.';
        this.toastService.error('Error', msg);
      }
    });
  }

  onSubmitEditUser(): void {
    const u = this.editingUser();
    if (!u) return;

    this.isSubmittingForm.set(true);
    const formData = new FormData();
    if (this.formEmployeeId.trim()) formData.append('username', this.formEmployeeId.trim());
    formData.append('full_name', this.formFullName.trim());
    formData.append('phone', this.formMobile.trim());
    formData.append('gender', this.formGender);
    formData.append('status', this.formStatus);

    if (this.formOfficialPhone.trim()) formData.append('office_phone', this.formOfficialPhone.trim());
    if (this.formEmail.trim()) formData.append('email', this.formEmail.trim());
    if (this.formBranchId) formData.append('branch_id', this.formBranchId);
    formData.append('slab', this.formSlab.trim());
    if (this.formSalary.trim()) formData.append('salary', this.formSalary.trim());
    if (this.formDateOfJoining) formData.append('date_of_joining', this.formDateOfJoining);
    if (this.formDateOfRelieving) formData.append('date_of_relieving', this.formDateOfRelieving);
    if (this.formDateOfRejoining) formData.append('date_of_rejoining', this.formDateOfRejoining);
    if (this.formBankAccountNumber.trim()) formData.append('bank_account_number', this.formBankAccountNumber.trim());
    if (this.formBankHolderName.trim()) formData.append('bank_holder_name', this.formBankHolderName.trim());
    if (this.formBankIfscCode.trim()) formData.append('bank_ifsc_code', this.formBankIfscCode.trim());
    if (this.formAddress.trim()) formData.append('address', this.formAddress.trim());
    if (this.selectedAadharFile) formData.append('aadhar_image', this.selectedAadharFile);
    if (this.roleCode === 'MANAGER' || u.roleCode === 'MANAGER') {
      if (this.formManagedBranchIds.length > 0) {
        this.formManagedBranchIds.forEach(id => formData.append('managed_branch_ids', id.toString()));
      } else {
        formData.append('managed_branch_ids', '');
      }
    }

    this.userListService.updateUser(u.dbId, formData).subscribe({
      next: (res: any) => {
        this.isSubmittingForm.set(false);
        this.toastService.success('Updated', `${this.roleTitle} details updated successfully.`);
        this.closeEditModal();
        this.fetchUsers();
      },
      error: (err: any) => {
        console.error('Error updating user:', err);
        this.isSubmittingForm.set(false);
        this.toastService.error('Update Failed', 'Could not update user details.');
      }
    });
  }

  // Toggle Active / Inactive Status
  onToggleStatus(user: UserRecord): void {
    const nextStatus = user.status.toLowerCase() === 'active' ? 'Inactive' : 'Active';
    const msg = `Are you sure you want to set the status of "${user.fullName}" to ${nextStatus}?`;
    if (confirm(msg)) {
      this.userListService.toggleUserStatus(user.dbId, nextStatus).subscribe({
        next: () => {
          this.toastService.success('Status Changed', `User status updated to ${nextStatus}`);
          this.fetchUsers();
        },
        error: (err) => {
          console.error('Status update error:', err);
          this.toastService.error('Error', 'Failed to update user status.');
        }
      });
    }
  }

  // Delete User
  onDeleteUser(user: UserRecord): void {
    const msg = `WARNING: Are you sure you want to permanently delete or relieve ${this.roleTitle} "${user.fullName}" (${user.id})?`;
    if (confirm(msg)) {
      this.userListService.deleteUser(user.dbId).subscribe({
        next: () => {
          this.toastService.success('User Deleted', `${this.roleTitle} removed successfully.`);
          this.fetchUsers();
        },
        error: (err) => {
          console.error('Delete error:', err);
          this.toastService.error('Delete Failed', 'Unable to delete user.');
        }
      });
    }
  }

  // Bulk Upload Modal Handlers
  openUploadModal(): void {
    this.selectedExcelFile = null;
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
    this.selectedExcelFile = null;
  }

  onExcelFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedExcelFile = file;
    }
  }

  onSubmitUploadExcel(): void {
    if (!this.selectedExcelFile) {
      this.toastService.error('File Required', 'Please select an Excel file (.xlsx) to upload.');
      return;
    }

    this.isSubmittingForm.set(true);
    this.userListService.uploadRoleUsersExcel(this.selectedExcelFile, this.roleCode).subscribe({
      next: (res: any) => {
        this.isSubmittingForm.set(false);
        const created = res.data?.created ?? 0;
        const updated = res.data?.updated ?? 0;
        const leftOut = res.data?.left_out ?? res.data?.skipped ?? 0;

        const summaryMsg = `Bulk upload complete! Created: ${created}, Updated: ${updated}, Left Out (Branch Mismatch / Skipped): ${leftOut}`;
        if (leftOut > 0) {
          this.toastService.warning('Upload Completed with Warnings', summaryMsg);
        } else {
          this.toastService.success('Upload Successful', summaryMsg);
        }
        this.closeUploadModal();
        this.fetchUsers();
      },
      error: (err: any) => {
        console.error('Excel upload error:', err);
        this.isSubmittingForm.set(false);
        const errMsg = err.error?.message || 'Failed to process bulk upload file.';
        this.toastService.error('Upload Error', errMsg);
      }
    });
  }

  onDownloadSampleTemplate(): void {
    const roleLower = this.roleCode.toLowerCase();
    this.userListService.downloadSampleTemplate(roleLower).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sample_${roleLower}_users.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.toastService.success('Sample Downloaded', `sample_${roleLower}_users.xlsx downloaded.`);
      },
      error: () => {
        const headers = [
          'Employee ID', 'Full Name', 'Official Name', 'Mobile Number', 'Official Number',
          'Gender', 'Status', 'Role', 'Slab', 'Salary',
          'Date of Joining', 'Date of Relieving', 'Date of Rejoining',
          'Bank Account Holder Name', 'Bank Account Number', 'IFSC Code', 'Address', 'Branch Name'
        ];
        const sampleRows = [
          ['EMP001', 'Anitha M', 'Anitha Murugan', '9876543210', '044-24567890', 'Female', 'Active', this.roleTitle, 'SLAB-1', '15000', '2024-01-15', '', '', 'Anitha M', '987654321012', 'SBIN0001234', '123 Main Street, Chennai', 'ADAMBAKKAM'],
          ['EMP002', 'Kavitha S', 'Kavitha S', '9876543211', '044-24567891', 'Female', 'Active', this.roleTitle, 'SLAB-2', '18000', '2023-06-01', '', '', 'Kavitha S', '987654321013', 'HDFC0005678', '45 Park Avenue, Madurai', 'ADAMBAKKAM']
        ];
        let csvContent = headers.join(',') + '\n';
        sampleRows.forEach(row => {
          csvContent += row.map(val => `"${val}"`).join(',') + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sample_${roleLower}_users.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.toastService.info('Sample Downloaded', `Sample ${this.roleTitle} template downloaded.`);
      }
    });
  }

  // Export Excel Handler
  onExportExcel(): void {
    const branch = this.selectedBranch();
    const search = this.searchQuery().trim();

    this.toastService.info('Generating Export', `Preparing Excel spreadsheet for ${this.roleTitle} users...`);
    this.userListService.exportRoleUsersExcel(this.roleCode, branch, search).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.roleCode.toLowerCase()}_users_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.toastService.success('Export Complete', `${this.roleTitle} users exported successfully.`);
      },
      error: (err: any) => {
        console.error('Export error:', err);
        this.toastService.error('Export Failed', 'Unable to generate Excel file.');
      }
    });
  }

  // Aadhar Preview Modal
  openAadharModal(user: UserRecord): void {
    this.selectedAadharUser.set(user);
  }

  closeAadharModal(): void {
    this.selectedAadharUser.set(null);
  }
}
