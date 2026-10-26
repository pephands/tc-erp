import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TrustChildFormComponent } from './trust-child-form/trust-child-form.component';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TrustChildrenService, TrustChildRecord } from '../../services/trust-children.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { Endpoint } from '../../http/endpoint';
import * as XLSX from 'xlsx';
@Component({
  selector: 'app-trust-children',
  standalone: true,
  imports: [CommonModule, TrustChildFormComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './trust-children.component.html',
  styleUrl: './trust-children.component.css'
})
export class TrustChildrenComponent implements OnInit {
  @ViewChild('trustChildForm') trustChildForm!: TrustChildFormComponent;
  activeBranch: any = null;

  private service = inject(TrustChildrenService);
  private branchListService = inject(BranchListService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private endpoint = inject(Endpoint);

  Math = Math;

  isSuperintendent = computed(() => this.authService.hasRole(['SUPERINTENDENT']) && !this.authService.hasRole(['ADMIN', 'MANAGER', 'OT', 'ONLINE PAYMENT TEAM']));
  isAdmin = computed(() => this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
  isOT = computed(() => this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM']));
  canViewAllTrust = computed(() => this.isAdmin() || this.isOT());
  canBulkUpload = computed(() => this.isAdmin() || this.isOT());

  availableTrustBranches = computed(() => {
    const list = this.branchesList();
    if (this.canViewAllTrust()) {
      return list;
    }
    const userBranch = this.authService.currentUser()?.branch;
    if (!userBranch) return [];

    const userBranchAny = userBranch as any;
    const matched = list.filter(b => 
      String(b.id) === String(userBranch.id) || 
      (b.name && b.name.toLowerCase() === (userBranch.name || '').toLowerCase()) ||
      (b.code && userBranchAny.code && b.code.toLowerCase() === String(userBranchAny.code).toLowerCase())
    );

    if (matched.length === 0 && userBranch) {
      return [{
        id: userBranch.id,
        name: userBranch.name,
        code: userBranchAny.code || ''
      }];
    }
    return matched;
  });

  // Bulk Upload Modal Signals
  isBulkUploadModalOpen = signal<boolean>(false);
  isBulkUploading = signal<boolean>(false);
  selectedBulkFile = signal<File | null>(null);
  bulkUploadFileName = signal<string>('No file chosen');
  bulkUploadError = signal<string | null>(null);
  bulkUploadErrorsList = signal<string[]>([]);
  bulkUploadSuccessMessage = signal<string | null>(null);

  get userBranchName(): string {
    return this.authService.currentUser()?.branch?.name || '';
  }

  get userBranchId(): number | null {
    return this.authService.currentUser()?.branch?.id || null;
  }

  children = this.service.getChildren();

  // Search, Filter & Pagination State
  filterBranch = signal<string>('');
  filterGender = signal<string>('');
  filterCategory = signal<string>('');
  filterStatus = signal<string>('');
  filterDoj = signal<string>('');
  filterDischarge = signal<string>('');
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
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Live branches list from API
  branchesList = signal<any[]>([]);
  branchSearchTerm = signal<string>('');
  filteredModalBranches = computed(() => {
    const search = this.branchSearchTerm().trim().toLowerCase();
    const list = this.canViewAllTrust() ? this.branchesList() : this.availableTrustBranches();
    if (!search) return list;
    return list.filter(b =>
      b.code?.toLowerCase().includes(search) ||
      b.name?.toLowerCase().includes(search)
    );
  });

  isBranchDropdownOpen = signal<boolean>(false);

  toggleBranchDropdown(): void {
    this.isBranchDropdownOpen.update(val => !val);
  }

  selectBranch(id: string | number): void {
    this.childForm.patchValue({ trust_name: id });
    this.isBranchDropdownOpen.set(false);
    this.branchSearchTerm.set('');
  }

  getBranchName(id: string | number): string {
    if (!id) return 'Select Branch';
    const b = this.branchesList().find(x => String(x.id) === String(id));
    return b ? `${b.code} - ${b.name}` : 'Select Branch';
  }

  // Modal Dialog Signals
  isModalOpen = signal<boolean>(false);
  modalMode = signal<'create' | 'edit'>('create');
  editingChild = signal<TrustChildRecord | null>(null);

  // Upload Form
  childForm: FormGroup;
  selectedFile = signal<File | null>(null);
  uploadFileName = signal<string>('No file chosen');
  existingDocumentUrl = signal<string | null>(null);
  removeDocumentFlag = signal<boolean>(false);

  // Person Image (Passport Photo)
  selectedPersonImage = signal<File | null>(null);
  uploadPersonImageName = signal<string>('No photo chosen');
  existingPersonImageUrl = signal<string | null>(null);
  removePersonImageFlag = signal<boolean>(false);
  personImagePreview = signal<string | null>(null);
  personImageError = signal<string | null>(null);

  getAbsoluteUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = this.endpoint.baseUrl.endsWith('/')
      ? this.endpoint.baseUrl.slice(0, -1)
      : this.endpoint.baseUrl;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  constructor() {
    this.childForm = this.fb.group({
      children_name: ['', Validators.required],
      trust_name: ['', Validators.required],
      license_no: ['', Validators.required],
      mobile_number: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      gender: ['', Validators.required],
      category: ['', Validators.required],
      aadhar_no: ['', [Validators.required, Validators.pattern('^[0-9]{12}$')]],
      date_of_joining: ['', Validators.required],
      discharge_date: [''],
      address: ['', Validators.required],
      parent_details: ['', Validators.required],
      parent_name: [''],
      parent_occupation: [''],
      birth_marks: [''],
      udid_no: [''],
      disability_certificate_no: [''],
      date_of_birth: [''],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    if (!this.canViewAllTrust()) {
      const bId = this.userBranchId;
      if (bId) {
        this.filterBranch.set(String(bId));
      }
    }
    this.loadBranches();
    this.fetchChildrenFromApi();
  }

  loadBranches(): void {
    this.branchListService.getData(1, 1000, undefined, 'true', 'true').subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.branchesList.set(data);
        if (!this.canViewAllTrust()) {
          const userBranch = this.authService.currentUser()?.branch;
          if (userBranch?.id) {
            this.filterBranch.set(String(userBranch.id));
          }
        }
      },
      error: (err: any) => {
        console.error('Error loading branches:', err);
      }
    });
  }

  fetchChildrenFromApi(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    let branchFilter = this.filterBranch();
    if (!this.canViewAllTrust()) {
      branchFilter = this.userBranchId ? String(this.userBranchId) : (this.userBranchName || '');
      this.filterBranch.set(branchFilter);
    }
    const filters = {
      trust_name: branchFilter,
      gender: this.filterGender(),
      category: this.filterCategory(),
      is_active: this.filterStatus(),
      date_of_joining: this.filterDoj(),
      discharge_date: this.filterDischarge(),
      search: search,
      page: this.currentPage(),
      page_size: this.pageSize()
    };

    this.service.fetchChildren(filters).subscribe({
      next: (res: any) => {
        if (res && res.count !== undefined) {
          this.totalCount.set(res.count);
        } else if (res && Array.isArray(res.data)) {
          this.totalCount.set(res.data.length);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching trust children:', err);
        this.isLoading.set(false);
      }
    });
  }

  filteredChildren = computed(() => {
    return this.children();
  });

  paginatedChildren = computed(() => {
    return this.children();
  });

  totalPages = computed(() => {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
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
      this.fetchChildrenFromApi();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchChildrenFromApi();
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPages());
    this.fetchChildrenFromApi();
  }

  onFilterSubmit(): void {
    this.currentPage.set(1);
    this.fetchChildrenFromApi();
  }

  onClearFilters(): void {
    if (!this.canViewAllTrust()) {
      const bId = this.userBranchId;
      this.filterBranch.set(bId ? String(bId) : (this.userBranchName || ''));
    } else {
      this.filterBranch.set('');
    }
    this.filterGender.set('');
    this.filterCategory.set('');
    this.filterStatus.set('');
    this.filterDoj.set('');
    this.filterDischarge.set('');
    this.searchQuery.set('');
    this.onFilterSubmit();
  }

  downloadExcel(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    let branchFilter = this.filterBranch();
    if (!this.canViewAllTrust()) {
      branchFilter = this.userBranchId ? String(this.userBranchId) : (this.userBranchName || '');
    }
    const filters = {
      trust_name: branchFilter,
      gender: this.filterGender(),
      category: this.filterCategory(),
      is_active: this.filterStatus(),
      date_of_joining: this.filterDoj(),
      discharge_date: this.filterDischarge(),
      search: search,
      no_pagination: 'true'
    };

    this.service.fetchChildren(filters).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        const data = items.map((child: any, index: number) => {
          return {
            "S.No": index + 1,
            "ID": child.id,
            "Child Name": child.children_name,
            "Trust Name": child.trust_branch_name,
            "License No": child.license_no,
            "Gender": child.gender,
            "Category": child.category,
            "Aadhar No": child.aadhar_no,
            "Date of Joining": child.date_of_joining,
            "Discharge Date": child.discharge_date || '',
            "Status": child.is_active ? 'Active' : 'Inactive',
            "Parent Details": child.parent_details,
            "Address": child.address,
            "Mobile Number": child.mobile_number || '',
            "Created By": child.created_by_name || '-',
            "Created At": child.created_at ? new Date(child.created_at).toLocaleString() : '-',
            "Updated By": child.updated_by_name || '-',
            "Updated At": child.updated_at ? new Date(child.updated_at).toLocaleString() : '-'
          };
        });

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const workbook: XLSX.WorkBook = { Sheets: { 'Trust Children': worksheet }, SheetNames: ['Trust Children'] };
        XLSX.writeFile(workbook, `Trust_Children_Report_${new Date().getTime()}.xlsx`);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error downloading excel:', err);
        this.isLoading.set(false);
      }
    });
  }

  openBulkUploadModal(): void {
    this.selectedBulkFile.set(null);
    this.bulkUploadFileName.set('No file chosen');
    this.bulkUploadError.set(null);
    this.bulkUploadErrorsList.set([]);
    this.bulkUploadSuccessMessage.set(null);
    this.isBulkUploadModalOpen.set(true);
  }

  closeBulkUploadModal(): void {
    if (this.isBulkUploading()) return;
    this.isBulkUploadModalOpen.set(false);
    this.selectedBulkFile.set(null);
    this.bulkUploadFileName.set('No file chosen');
    this.bulkUploadError.set(null);
    this.bulkUploadErrorsList.set([]);
    this.bulkUploadSuccessMessage.set(null);
  }

  onBulkFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const name = file.name.toLowerCase();
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
        this.bulkUploadError.set('Please select an Excel (.xlsx, .xls) or CSV file.');
        this.selectedBulkFile.set(null);
        this.bulkUploadFileName.set('No file chosen');
        return;
      }
      this.selectedBulkFile.set(file);
      this.bulkUploadFileName.set(file.name);
      this.bulkUploadError.set(null);
      this.bulkUploadErrorsList.set([]);
      this.bulkUploadSuccessMessage.set(null);
    }
  }

  onDownloadSampleTemplate(): void {
    this.service.downloadSampleTemplate().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Trust_Children_Sample_Template.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Error downloading template from API, falling back to local generation:', err);
        const templateHeaders = [
          {
            "ID": "",
            "Child Name": "RAJESH KUMAR",
            "Trust Name": this.userBranchName || "PAAVAI TRICHY TRUST",
            "License No": "5342343542",
            "Gender": "Male",
            "Category": "SPECIAL CHILDREN",
            "Aadhar No": "534231245342",
            "Date of Joining": "2026-06-08",
            "Discharge Date": "",
            "Status": "Active",
            "Parent Details": "Father: Kumar, Mother: Lakshmi",
            "Address": "12, North Street, Trichy",
            "Mobile Number": "9876543210"
          },
          {
            "ID": "1",
            "Child Name": "THIRUPPATHI SIVAN",
            "Trust Name": this.userBranchName || "PAAVAI TRICHY TRUST",
            "License No": "456789787",
            "Gender": "Male",
            "Category": "OLDAGEHOME",
            "Aadhar No": "456786543456",
            "Date of Joining": "2026-10-01",
            "Discharge Date": "2026-10-30",
            "Status": "Active",
            "Parent Details": "Parent details info",
            "Address": "10 Main Road, Trichy",
            "Mobile Number": "9877654321"
          }
        ];
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(templateHeaders);
        const wb: XLSX.WorkBook = { Sheets: { 'Trust Children Template': ws }, SheetNames: ['Trust Children Template'] };
        XLSX.writeFile(wb, 'Trust_Children_Sample_Template.xlsx');
      }
    });
  }

  onSubmitBulkUpload(): void {
    const file = this.selectedBulkFile();
    if (!file) {
      this.bulkUploadError.set('Please choose an Excel (.xlsx, .xls) or CSV file to upload.');
      return;
    }

    this.isBulkUploading.set(true);
    this.bulkUploadError.set(null);
    this.bulkUploadErrorsList.set([]);
    this.bulkUploadSuccessMessage.set(null);

    const formData = new FormData();
    formData.append('file', file);
    if (!this.authService.hasRole(['ADMIN']) && this.userBranchId) {
      formData.append('trust_name', String(this.userBranchId));
    }

    this.service.bulkUpload(formData).subscribe({
      next: (res: any) => {
        this.isBulkUploading.set(false);
        this.bulkUploadSuccessMessage.set(res.message || 'Bulk upload processed successfully!');
        this.fetchChildrenFromApi();
        setTimeout(() => {
          this.closeBulkUploadModal();
        }, 1800);
      },
      error: (err: any) => {
        this.isBulkUploading.set(false);
        const errMsg = err.error?.message || 'Failed to process bulk upload file.';
        this.bulkUploadError.set(errMsg);
        if (Array.isArray(err.error?.errors)) {
          this.bulkUploadErrorsList.set(err.error.errors);
        } else {
          this.bulkUploadErrorsList.set([]);
        }
      }
    });
  }

  onCreateNew(): void {
    this.modalMode.set('create');
    this.editingChild.set(null);
    this.onResetForm();

    if (!this.canViewAllTrust() && (this.userBranchId || this.userBranchName)) {
      this.childForm.patchValue({ trust_name: this.userBranchId || this.userBranchName });
    }

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.uploadFileName.set(file.name);
      this.removeDocumentFlag.set(false);
    } else {
      this.selectedFile.set(null);
      this.uploadFileName.set(this.existingDocumentUrl() && !this.removeDocumentFlag() ? 'Current file preserved' : 'No file chosen');
    }
  }

  onRemoveDocument(): void {
    this.removeDocumentFlag.set(true);
    this.existingDocumentUrl.set(null);
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
  }

  onPersonImageChange(event: any): void {
    this.personImageError.set(null);
    const file = event.target?.files?.[0];
    if (!file) {
      return;
    }

    // Only allow image format
    if (!file.type.startsWith('image/')) {
      this.personImageError.set('Only image files (JPG, PNG, JPEG, WEBP) are allowed for passport photo.');
      if (event.target) event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.personImageError.set('Photo file size must not exceed 5MB.');
      if (event.target) event.target.value = '';
      return;
    }

    // Validate passport photo aspect ratio (Portrait or near-square)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = img.width / img.height;
      if (ratio > 1.15) {
        this.personImageError.set('Invalid photo aspect ratio. Please upload a passport size photo in portrait orientation (height must be greater than or equal to width).');
        if (event.target) event.target.value = '';
        return;
      }

      this.personImageError.set(null);
      this.selectedPersonImage.set(file);
      this.uploadPersonImageName.set(file.name);
      this.removePersonImageFlag.set(false);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.personImagePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      this.personImageError.set('Failed to read image file. Please upload a valid image.');
      if (event.target) event.target.value = '';
    };

    img.src = objectUrl;
  }

  onRemovePersonImage(): void {
    this.personImageError.set(null);
    this.removePersonImageFlag.set(true);
    this.existingPersonImageUrl.set(null);
    this.selectedPersonImage.set(null);
    this.personImagePreview.set(null);
    this.uploadPersonImageName.set('No photo chosen');
  }

  onResetForm(): void {
    this.childForm.reset({
      is_active: true
    });
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.existingDocumentUrl.set(null);
    this.removeDocumentFlag.set(false);
    this.selectedPersonImage.set(null);
    this.uploadPersonImageName.set('No photo chosen');
    this.existingPersonImageUrl.set(null);
    this.removePersonImageFlag.set(false);
    this.personImagePreview.set(null);
    this.personImageError.set(null);
    this.branchSearchTerm.set('');
  }

  onSubmitForm(): void {
    if (!this.canViewAllTrust() && (this.userBranchId || this.userBranchName) && !this.childForm.value.trust_name) {
      this.childForm.patchValue({ trust_name: this.userBranchId || this.userBranchName });
    }

    if (this.childForm.invalid) {
      this.childForm.markAllAsTouched();
      return;
    }

    const values = this.childForm.value;

    const formData = new FormData();

    // Capitalize specific fields
    if (values.children_name) values.children_name = values.children_name.toUpperCase();
    if (values.parent_details) values.parent_details = values.parent_details.toUpperCase();
    if (values.address) values.address = values.address.toUpperCase();
    if (values.license_no) values.license_no = values.license_no.toUpperCase();
    if (values.parent_name) values.parent_name = values.parent_name.toUpperCase();
    if (values.parent_occupation) values.parent_occupation = values.parent_occupation.toUpperCase();
    if (values.birth_marks) values.birth_marks = values.birth_marks.toUpperCase();
    if (values.udid_no) values.udid_no = values.udid_no.toUpperCase();
    if (values.disability_certificate_no) values.disability_certificate_no = values.disability_certificate_no.toUpperCase();

    Object.keys(values).forEach(key => {
      if (values[key] !== null && values[key] !== undefined) {
        if (key === 'is_active') {
          formData.append(key, values[key] ? 'true' : 'false');
        } else {
          formData.append(key, values[key]);
        }
      }
    });

    const file = this.selectedFile();
    if (file) {
      formData.append('document', file);
    } else if (this.removeDocumentFlag()) {
      formData.append('document', ''); // Empty string to clear on backend
    }

    const personImage = this.selectedPersonImage();
    if (personImage) {
      formData.append('person_image', personImage);
    } else if (this.removePersonImageFlag()) {
      formData.append('person_image', ''); // Empty string to clear on backend
    }

    this.isSubmitting.set(true);

    if (this.modalMode() === 'create') {
      this.service.createChild(formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.fetchChildrenFromApi();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error creating record:', err);
          alert(err.error?.message || 'Failed to create record.');
        }
      });
    } else {
      const editId = this.editingChild()?.id;
      if (!editId) return;

      this.service.updateChild(editId, formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.fetchChildrenFromApi();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error updating record:', err);
          alert(err.error?.message || 'Failed to update record.');
        }
      });
    }
  }

  onEditChild(child: TrustChildRecord): void {
    this.modalMode.set('edit');
    this.editingChild.set(child);

    this.childForm.patchValue({
      children_name: child.children_name,
      trust_name: child.trust_name,
      license_no: child.license_no,
      mobile_number: child.mobile_number,
      gender: child.gender,
      category: child.category,
      aadhar_no: child.aadhar_no,
      date_of_joining: child.date_of_joining,
      discharge_date: child.discharge_date,
      address: child.address,
      parent_details: child.parent_details,
      parent_name: child.parent_name,
      parent_occupation: child.parent_occupation,
      birth_marks: child.birth_marks,
      udid_no: child.udid_no,
      disability_certificate_no: child.disability_certificate_no,
      date_of_birth: child.date_of_birth,
      is_active: child.is_active
    });

    this.selectedFile.set(null);
    this.existingDocumentUrl.set(child.document || null);
    this.removeDocumentFlag.set(false);
    this.uploadFileName.set(child.file_name ? `Current: ${child.file_name}` : 'No file chosen');

    this.selectedPersonImage.set(null);
    this.existingPersonImageUrl.set(child.person_image || null);
    this.personImagePreview.set(child.person_image ? this.getAbsoluteUrl(child.person_image) : null);
    this.removePersonImageFlag.set(false);
    this.uploadPersonImageName.set(child.person_image ? (child.person_image_name ? `Current: ${child.person_image_name}` : 'Current photo preserved') : 'No photo chosen');
    this.personImageError.set(null);

    this.isModalOpen.set(true);
  }

  onToggleStatus(child: TrustChildRecord): void {
    const action = child.is_active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} "${child.children_name}"?`)) {
      this.service.deleteChild(child.id).subscribe({
        next: (res: any) => {
          alert(res.message || `Status changed successfully.`);
          this.fetchChildrenFromApi();
        },
        error: (err: any) => {
          console.error(`Error trying to ${action}:`, err);
          alert(`Failed to ${action}. Please try again.`);
        }
      });
    }
  }

  onViewDocument(child: TrustChildRecord): void {
    if (child.document) {
      window.open(child.document, '_blank');
    } else {
      alert(`No document file available for "${child.children_name}".`);
    }
  }

  async downloadApplication(child: TrustChildRecord): Promise<void> {
    this.editingChild.set(child);
    this.activeBranch = this.branchesList().find(b => b.id === child.trust_name) || {
      name: child.trust_branch_name || 'N/A',
      address: 'N/A',
      phone: 'N/A',
      email: 'N/A'
    };

    try {
      if (this.trustChildForm) {
        await this.trustChildForm.prepareForPdf(child, this.activeBranch);
      }
      // Give Angular change detection a moment to render the template with the loaded image
      await new Promise(resolve => setTimeout(resolve, 200));

      const blob = await this.trustChildForm.generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Application_${child.children_name?.replace(/\s+/g, '_') || 'Child'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF');
    }
  }
}
