import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TrustChildrenService, TrustChildRecord } from '../../services/trust-children.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import * as XLSX from 'xlsx';
import { PAAVAI_NEW_LETTERHEAD_B64 } from '../../constants/new-letterhead-image';
import { PAAVAI_LOGO_B64 } from '../../constants/logo-image';

declare var html2pdf: any;
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
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  Math = Math;

  isSuperintendent = computed(() => this.authService.hasRole(['SUPERINTENDENT']) && !this.authService.hasRole(['ADMIN', 'MANAGER']));

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
    this.loadBranches();
    if (!this.authService.hasRole(['ADMIN']) && (this.userBranchId || this.userBranchName)) {
      this.filterBranch.set(String(this.userBranchId || this.userBranchName));
    }
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
    let branchFilter = this.filterBranch();
    if (!this.authService.hasRole(['ADMIN']) && !branchFilter) {
      branchFilter = this.userBranchName || '';
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
    if (!this.authService.hasRole(['ADMIN']) && (this.userBranchId || this.userBranchName)) {
      this.filterBranch.set(String(this.userBranchId || this.userBranchName));
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
    if (!this.authService.hasRole(['ADMIN']) && !branchFilter) {
      branchFilter = this.userBranchName || '';
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

    if (this.userBranchId || this.userBranchName) {
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
    if ((this.userBranchId || this.userBranchName) && !this.childForm.value.trust_name) {
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

  downloadApplication(child: TrustChildRecord): void {
    const branch = this.branchesList().find(b => b.id === child.trust_name) || {
      name: child.trust_branch_name || 'N/A',
      address: 'N/A',
      phone: 'N/A',
      email: 'N/A'
    };

    let age = 'N/A';
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      const diff_ms = Date.now() - dob.getTime();
      const age_dt = new Date(diff_ms); 
      age = Math.abs(age_dt.getUTCFullYear() - 1970) + ' YEARS';
    }

    const regdHtml = branch.regd_no ? `<div style="margin-bottom: 3px; background: white; display: inline-block; padding: 0 4px;">Regd. No.${branch.regd_no}</div>` : '';
    const panHtml = branch.pan_no ? `<div style="margin-bottom: 3px; background: white; display: inline-block; padding: 0 4px;">PAN No: ${branch.pan_no}</div>` : '';
    const ngoHtml = branch.ngo_darpan_id ? `<div style="margin-bottom: 3px; background: white; display: inline-block; padding: 0 4px;">NGO Darpan ID: ${branch.ngo_darpan_id}</div>` : '';

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert("Please allow popups to print the application.");
      return;
    }
    
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: 'Arial', sans-serif; position: relative; width: 794px; height: 1123px; color: #333; background-image: url('${PAAVAI_NEW_LETTERHEAD_B64}'); background-size: 100% 100%; background-position: center; background-repeat: no-repeat; box-sizing: border-box;">
        
        <!-- Trust Details Overlay (Top Right) -->
        <div style="position: absolute; top: 50px; right: 25px; width: 170px; height: 60px; background: white; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-end; font-size: 9px; color: #333; font-weight: bold; line-height: 1.5; z-index: 10; padding: 2px;">
          ${branch.regd_no ? `<div>Regd. No. ${branch.regd_no}</div>` : ''}
          ${branch.pan_no ? `<div>PAN No: ${branch.pan_no}</div>` : ''}
          ${branch.ngo_darpan_id ? `<div>NGO Darpan ID: ${branch.ngo_darpan_id}</div>` : ''}
        </div>

        <!-- Content -->
        <div style="padding: 0 50px; position: absolute; top: 220px; left: 0; right: 0; z-index: 2;">
          <div style="position: absolute; top: 0; right: 50px; width: 110px; height: 140px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999; background: white;">
            Affix Photo
          </div>
          
          <div style="font-weight: bold; margin-bottom: 30px; font-size: 14px;">
            ADMISSION DATE: ${child.date_of_joining ? new Date(child.date_of_joining).toLocaleDateString('en-GB') : '-'}
          </div>

          <div style="display: flex; flex-direction: column; gap: 15px; font-size: 14px;">
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">1. NAME:</span>
              <span>${child.children_name}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">2. PARENT / GUARDIAN NAME:</span>
              <span>${child.parent_name || child.parent_details || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">3. DOB/AGE:</span>
              <span>${(child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString('en-GB') : '-')} / ${age}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">4. GENDER:</span>
              <span>${child.gender || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">5. PERMANENT ADDRESS:</span>
              <span>${child.address || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">6. PARENTAL OCCUPATION:</span>
              <span>${child.parent_occupation || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">7. BIRTH MARKS:</span>
              <span>${child.birth_marks || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">8. CHILDREN CATEGORY:</span>
              <span>${child.category || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">9. DISABILITY PERCENTAGE:</span>
              <span>-</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">10. UDID NO:</span>
              <span>${child.udid_no || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">11. DISABILITY CERTIFICATE NO:</span>
              <span>${child.disability_certificate_no || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">12. AADHAR CARD NO:</span>
              <span>${child.aadhar_no || '-'}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 260px;">13. PHONE NO:</span>
              <span>${child.mobile_number || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(element);

    const opt = {
      margin:       0,
      filename:     `Application_${child.children_name.replace(/\\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
      document.body.removeChild(element);
    });
  }
}
