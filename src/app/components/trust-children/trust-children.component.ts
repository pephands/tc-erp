import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TrustChildrenService, TrustChildRecord } from '../../services/trust-children.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-trust-children',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './trust-children.component.html',
  styleUrl: './trust-children.component.css'
})
export class TrustChildrenComponent implements OnInit {
  private service = inject(TrustChildrenService);
  private branchListService = inject(BranchListService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  Math = Math;

  isSuperintendent = computed(() => this.authService.hasRole(['SUPERINTENDENT']));


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
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Live branches list from API
  branchesList = signal<any[]>([]);
  branchSearchTerm = signal<string>('');
  filteredModalBranches = computed(() => {
    const search = this.branchSearchTerm().trim().toLowerCase();
    const list = this.branchesList();
    if (!search) return list;
    return list.filter(b =>
      b.code.toLowerCase().includes(search) ||
      b.name.toLowerCase().includes(search)
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
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadBranches();
    this.fetchChildrenFromApi();
  }

  loadBranches(): void {
    this.branchListService.getData(1, 1000, undefined, 'true', 'true').subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.branchesList.set(data);
      },
      error: (err: any) => {
        console.error('Error loading branches:', err);
      }
    });
  }

  fetchChildrenFromApi(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const filters = {
      trust_name: this.filterBranch(),
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
    this.filterBranch.set('');
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
    const filters = {
      trust_name: this.filterBranch(),
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
            "Child Name": child.children_name,
            "Trust Name": child.trust_branch_name,
            "License No": child.license_no,
            "Gender": child.gender,
            "Category": child.category,
            "Aadhar No": child.aadhar_no,
            "Date of Joining": child.date_of_joining,
            "Discharge Date": child.discharge_date || '-',
            "Status": child.is_active ? 'Active' : 'Inactive',
            "Parent Details": child.parent_details,
            "Address": child.address,
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

  onCreateNew(): void {
    this.modalMode.set('create');
    this.editingChild.set(null);
    this.onResetForm();
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

  onResetForm(): void {
    this.childForm.reset({
      is_active: true
    });
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.existingDocumentUrl.set(null);
    this.removeDocumentFlag.set(false);
    this.branchSearchTerm.set('');
  }

  onSubmitForm(): void {
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
      is_active: child.is_active
    });

    this.selectedFile.set(null);
    this.existingDocumentUrl.set(child.document || null);
    this.removeDocumentFlag.set(false);
    this.uploadFileName.set(child.file_name ? `Current: ${child.file_name}` : 'No file chosen');
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
}
