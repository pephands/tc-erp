import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { TelecallingService } from '../../services/telecalling.service';
import { AuthService } from '../../services/auth.service';
import { MasterDonorRecord } from '../../models/telecalling.model';

interface TCWorkstationData {
  id: number;
  employee_Id: string;
  full_name: string;
  total_assigned: number;
  completed: number;
  pending: number;
  branch_name: string;
}

@Component({
  selector: 'app-workstation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workstation.component.html',
  styleUrl: './workstation.component.css',
})
export class WorkstationComponent implements OnInit {
  private service = inject(TelecallingService);
  private authService = inject(AuthService);

  role = signal<string>('');

  // ----------------------------------------------------
  // TC WORKSTATION LOGIC
  // ----------------------------------------------------
  queue = this.service.tcQueueSignal;

  activeBaseTab = signal<'ADMIN' | 'TL'>('ADMIN');
  activeStatusTab = signal<'PENDING' | 'COMPLETED'>('PENDING');

  get currentQueueType(): string {
    if (this.activeBaseTab() === 'ADMIN') {
      return this.activeStatusTab() === 'PENDING' ? 'admin_pending' : 'admin_completed';
    } else {
      return this.activeStatusTab() === 'PENDING' ? 'tl_pending' : 'tl_completed';
    }
  }
  searchQuery = signal<string>('');
  filterDisposition = signal<string>('');
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
  totalRecords = signal<number>(0);
  totalPagesSignal = signal<number>(1);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  selectedDonor = signal<MasterDonorRecord | null>(null);
  isCallModalOpen = signal<boolean>(false);

  donorNameInput = signal<string>('');
  
  dobDay = signal<string>('');
  dobMonth = signal<string>('');
  dobYear = signal<string>('');

  anniDay = signal<string>('');
  anniMonth = signal<string>('');
  anniYear = signal<string>('');
  
  alternativeNumberInput = signal<string>('');
  
  callDisposition = signal<string>('');
  remarksInput = signal<string>('');

  days = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));
  months = [
    { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' }, { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
  ];
  years = Array.from({length: 201}, (_, i) => (new Date().getFullYear() + 100 - i).toString());

  dispositionOptions = signal<{value: string, label: string}[]>([]);
  
  // NEW REFERENCE MODAL LOGIC
  isNewReferenceModalOpen = signal<boolean>(false);
  newRefPhone = signal<string>('');
  newRefName = signal<string>('');
  newRefAlternativeNumber = signal<string>('');
  
  newRefDobDay = signal<string>('');
  newRefDobMonth = signal<string>('');
  newRefDobYear = signal<string>('');

  newRefAnniDay = signal<string>('');
  newRefAnniMonth = signal<string>('');
  newRefAnniYear = signal<string>('');
  
  newRefDisposition = signal<string>('');
  newRefRemarks = signal<string>('');
  modalErrorMessage = signal<string>('');

  paginatedQueue = computed(() => this.queue());
  totalPages = computed(() => this.totalPagesSignal());
  pagesArray = computed(() => {
    const total = this.totalPagesSignal();
    const curr = this.currentPage();
    const pages: number[] = [];
    const maxBtns = 6;
    let start = Math.max(1, curr - Math.floor(maxBtns / 2));
    let end = Math.min(total, start + maxBtns - 1);
    if (end - start + 1 < maxBtns) {
      start = Math.max(1, end - maxBtns + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  // ----------------------------------------------------
  // TL & ADMIN WORKSTATION LOGIC
  // ----------------------------------------------------
  tlIsLoading = signal<boolean>(false);
  tlDataList = signal<TCWorkstationData[]>([]);
  tlFilterStartDate = signal<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  );
  tlFilterEndDate = signal<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  );
  tlFilterAssignStatus = signal<string>('ASSIGNED');
  tlFilterBaseType = signal<string>('');
  tlSearchQuery = signal<string>('');
  isAdmin = signal<boolean>(false);
  branches = signal<any[]>([]);
  selectedBranch = signal<string>('');
  tlIsDownloading = signal<boolean>(false);

  tlCurrentPage = signal<number>(1);
  tlTotalRecords = signal<number>(0);
  tlTotalPagesSignal = signal<number>(1);

  tlTotalPages = computed(() => this.tlTotalPagesSignal());
  tlPagesArray = computed(() => {
    const total = this.tlTotalPagesSignal();
    const curr = this.tlCurrentPage();
    const pages: number[] = [];
    const maxBtns = 6;
    let start = Math.max(1, curr - Math.floor(maxBtns / 2));
    let end = Math.min(total, start + maxBtns - 1);
    if (end - start + 1 < maxBtns) {
      start = Math.max(1, end - maxBtns + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  setTlPage(page: number): void {
    if (page >= 1 && page <= this.tlTotalPagesSignal()) {
      this.tlCurrentPage.set(page);
      this.fetchTlData();
    }
  }

  nextTlPage(): void {
    if (this.tlCurrentPage() < this.tlTotalPagesSignal()) {
      this.tlCurrentPage.update(p => p + 1);
      this.fetchTlData();
    }
  }

  lastTlPage(): void {
    this.tlCurrentPage.set(this.tlTotalPagesSignal());
    this.fetchTlData();
  }

  // ----------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------
  ngOnInit(): void {
    const roles = this.authService.userRoles();
    if (roles.includes('ADMIN')) {
      this.role.set('ADMIN');
      this.isAdmin.set(true);
      this.fetchBranches();
      this.fetchTlData();
    } else if (roles.includes('TL')) {
      this.role.set('TL');
      this.fetchTlData();
    } else if (roles.includes('TC')) {
      this.role.set('TC');
      this.fetchQueue();
      this.fetchCallDispositions();
    }
  }

  // ----------------------------------------------------
  // TC METHODS
  // ----------------------------------------------------
  fetchCallDispositions(): void {
    this.service.getCallDispositions(true).subscribe({
      next: (res) => {
        let list: any[] = [];
        if (res && res.results) list = res.results;
        else if (Array.isArray(res)) list = res;
        else if (res && res.data) list = res.data;
        const options = list.map(d => ({ value: d.name, label: d.name }));
        this.dispositionOptions.set(options);
      },
      error: (err) => console.error('Error fetching call dispositions:', err)
    });
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 4000);
  }

  fetchQueue(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const page = this.currentPage();
    const size = this.pageSize();
    const queueType = this.currentQueueType;
    const disposition = this.filterDisposition();

    this.service.fetchTcQueue(page, size, search, queueType, disposition).subscribe({
      next: (res) => {
        this.totalRecords.set(res.totalCount);
        this.totalPagesSignal.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching calling queue:', err);
        this.isLoading.set(false);
      },
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
    this.fetchQueue();
  }

  onDispositionFilterChange(val: string): void {
    this.filterDisposition.set(val);
    this.currentPage.set(1);
    this.fetchQueue();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPagesSignal()) {
      this.currentPage.set(page);
      this.fetchQueue();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPagesSignal()) {
      this.currentPage.update((p) => p + 1);
      this.fetchQueue();
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPagesSignal());
    this.fetchQueue();
  }

  onOpenCallModal(donor: MasterDonorRecord): void {
    if (!this.isRowEditable(donor)) return;
    this.selectedDonor.set(donor);
    this.donorNameInput.set(donor.donorName);
    this.alternativeNumberInput.set(donor.alternative_number || '');

    if (donor.dob) {
      const parts = donor.dob.split('-');
      if (parts.length === 3) {
        this.dobYear.set(parts[0]);
        this.dobMonth.set(parts[1]);
        this.dobDay.set(parts[2]);
      }
    } else {
      this.dobYear.set('');
      this.dobMonth.set('');
      this.dobDay.set('');
    }

    if (donor.anniversary) {
      const parts = donor.anniversary.split('-');
      if (parts.length === 3) {
        this.anniYear.set(parts[0]);
        this.anniMonth.set(parts[1]);
        this.anniDay.set(parts[2]);
      }
    } else {
      this.anniYear.set('');
      this.anniMonth.set('');
      this.anniDay.set('');
    }

    this.callDisposition.set(donor.latestCallDisposition || '');
    this.remarksInput.set(donor.latestCallRemarks || '');
    this.isCallModalOpen.set(true);
  }

  isRowEditable(donor: MasterDonorRecord): boolean {
    return true; 
  }

  closeCallModal(): void {
    this.isCallModalOpen.set(false);
    this.selectedDonor.set(null);
  }

  clearDob(): void {
    this.dobDay.set('');
    this.dobMonth.set('');
    this.dobYear.set('');
  }

  clearAnniversary(): void {
    this.anniDay.set('');
    this.anniMonth.set('');
    this.anniYear.set('');
  }

  onSubmitCallLog(): void {
    const donor = this.selectedDonor();
    if (!donor) return;
    const disposition = this.callDisposition();
    const remarks = this.remarksInput().trim().toUpperCase();
    const updatedName = this.donorNameInput().trim().toUpperCase();
    const updatedDob = (this.dobYear() && this.dobMonth() && this.dobDay()) ? `${this.dobYear()}-${this.dobMonth()}-${this.dobDay()}` : '';
    const updatedAnniversary = (this.anniYear() && this.anniMonth() && this.anniDay()) ? `${this.anniYear()}-${this.anniMonth()}-${this.anniDay()}` : '';
    this.modalErrorMessage.set('');

    if (!disposition) {
      this.modalErrorMessage.set('Please select a Call Disposition.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.logCall(donor.id, disposition, remarks, updatedName, updatedDob, updatedAnniversary, this.alternativeNumberInput().trim()).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeCallModal();
        this.triggerToast(`Call recorded for ${updatedName || donor.donorName}. Profile updated!`);
        this.fetchQueue();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error logging call:', err);
        const msg = err.error?.message || 'Failed to record call log.';
        this.modalErrorMessage.set(msg);
      },
    });
  }

  // ----------------------------------------------------
  // ADD NEW REFERENCE
  // ----------------------------------------------------
  openNewReferenceModal(): void {
    this.newRefPhone.set('');
    this.newRefAlternativeNumber.set('');
    this.newRefName.set('');
    this.newRefDobDay.set('');
    this.newRefDobMonth.set('');
    this.newRefDobYear.set('');
    this.newRefAnniDay.set('');
    this.newRefAnniMonth.set('');
    this.newRefAnniYear.set('');
    this.newRefDisposition.set('');
    this.newRefRemarks.set('');
    this.modalErrorMessage.set('');
    this.isNewReferenceModalOpen.set(true);
  }

  closeNewReferenceModal(): void {
    this.isNewReferenceModalOpen.set(false);
    this.modalErrorMessage.set('');
  }

  onNewRefPhoneChange(val: string): void {
    val = val.replace(/[^0-9]/g, '');
    this.newRefPhone.set(val);
  }

  clearNewRefDob(): void {
    this.newRefDobDay.set('');
    this.newRefDobMonth.set('');
    this.newRefDobYear.set('');
  }

  clearNewRefAnniversary(): void {
    this.newRefAnniDay.set('');
    this.newRefAnniMonth.set('');
    this.newRefAnniYear.set('');
  }

  onSubmitNewReference(): void {
    const phone = this.newRefPhone().trim();
    const name = this.newRefName().trim().toUpperCase();
    const disp = this.newRefDisposition();
    const rem = this.newRefRemarks().trim().toUpperCase();
    
    const dob = (this.newRefDobYear() && this.newRefDobMonth() && this.newRefDobDay()) ? `${this.newRefDobYear()}-${this.newRefDobMonth()}-${this.newRefDobDay()}` : '';
    const anni = (this.newRefAnniYear() && this.newRefAnniMonth() && this.newRefAnniDay()) ? `${this.newRefAnniYear()}-${this.newRefAnniMonth()}-${this.newRefAnniDay()}` : '';
    
    this.modalErrorMessage.set('');

    if (!phone || phone.length !== 10) {
      this.modalErrorMessage.set('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!dob && !anni) {
      this.modalErrorMessage.set('Please enter either Date of Birth (DOB) or Anniversary.');
      return;
    }
    if (!disp) {
      this.modalErrorMessage.set('Please select a Call Disposition.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.logNewReferenceCall(phone, name, disp, rem, dob, anni, this.newRefAlternativeNumber().trim()).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.closeNewReferenceModal();
        this.triggerToast(`New reference ${name} created and call logged successfully!`);
        this.fetchQueue();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error logging new reference:', err);
        const msg = err.error?.message || 'Failed to record new reference.';
        this.modalErrorMessage.set(msg);
      }
    });
  }

  setBaseTab(tab: 'ADMIN' | 'TL'): void {
    this.activeBaseTab.set(tab);
    this.filterDisposition.set('');
    this.currentPage.set(1);
    this.fetchQueue();
  }

  setStatusTab(tab: 'PENDING' | 'COMPLETED'): void {
    this.activeStatusTab.set(tab);
    this.filterDisposition.set('');
    this.currentPage.set(1);
    this.fetchQueue();
  }

  onDownloadAssignedData(): void {
    const search = this.searchQuery().trim();
    const queueType = this.currentQueueType;
    this.service.fetchAllTcQueue(search, queueType).subscribe({
      next: (list) => {
        if (!list || list.length === 0) {
          alert('No data available to download.');
          return;
        }

        const exportData = list.map((item, index) => ({
          'S.No': index + 1,
          'Donor Name': item.donorName || '',
          'Phone Number': item.phoneNumber || '',
          'DOB': item.dob || '',
          'Anniversary': item.anniversary || '',
          'Assigned Date': item.assignedTcAt ? item.assignedTcAt.slice(0, 10) : (item.createdAt ? item.createdAt.slice(0, 10) : ''),
          'Call Completed Date': (this.activeStatusTab() === 'COMPLETED' && item.status === 'COMPLETED' && item.updatedAt) ? item.updatedAt.slice(0, 10) : '',
          'Call Disposition': item.latestCallDisposition || '',
          'Remarks': item.latestCallRemarks || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        const sheetName = this.activeStatusTab() === 'PENDING' ? 'Pending Donors' : 'Completed Donors';
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        const fileName = `${this.currentQueueType}_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        this.triggerToast(`Downloaded ${list.length} assigned donors as Excel (.xlsx).`);
      },
      error: (err: any) => {
        console.error('Error exporting assigned data:', err);
        alert('Failed to download assigned data.');
      },
    });
  }

  // ----------------------------------------------------
  // TL & ADMIN METHODS
  // ----------------------------------------------------
  fetchBranches(): void {
    this.service.fetchBranches().subscribe({
      next: (res) => this.branches.set(res || []),
      error: (err) => console.error('Error fetching branches', err)
    });
  }

  fetchTlData(): void {
    this.tlIsLoading.set(true);
    this.service.fetchTlWorkstation(
      this.tlFilterStartDate(),
      this.tlFilterEndDate(),
      this.tlFilterAssignStatus(),
      this.tlSearchQuery(),
      this.selectedBranch(),
      this.tlFilterBaseType(),
      this.tlCurrentPage()
    ).subscribe({
      next: (res: any) => {
        let list = res;
        if (res && res.results) {
          list = res.results;
          this.tlTotalRecords.set(res.count || 0);
          this.tlTotalPagesSignal.set(Math.ceil((res.count || 0) / 10) || 1);
        } else {
          this.tlTotalRecords.set(list.length);
          this.tlTotalPagesSignal.set(1);
        }
        
        this.tlDataList.set(list || []);
        this.tlIsLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching TL workstation data', err);
        this.tlIsLoading.set(false);
      }
    });
  }

  onTlFilterChange(): void {
    this.tlCurrentPage.set(1);
    this.fetchTlData();
  }

  onTlSearchChange(): void {
    this.tlCurrentPage.set(1);
    this.fetchTlData();
  }

  resetTlFilters(): void {
    this.tlFilterStartDate.set(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    this.tlFilterEndDate.set(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    this.tlFilterAssignStatus.set('ASSIGNED');
    this.tlFilterBaseType.set('');
    this.selectedBranch.set('');
    this.tlSearchQuery.set('');
    this.tlCurrentPage.set(1);
    this.fetchTlData();
  }

  downloadTlExcel(): void {
    this.tlIsDownloading.set(true);
    this.service.fetchTlWorkstationExport(
      this.tlFilterStartDate(),
      this.tlFilterEndDate(),
      this.tlFilterAssignStatus(),
      this.tlSearchQuery(),
      this.selectedBranch(),
      this.tlFilterBaseType()
    ).subscribe({
      next: (res: any) => {
        this.tlIsDownloading.set(false);
        let list = res;
        if (res && res.results) list = res.results;
        else if (res && res.data) list = res.data;

        if (!list || list.length === 0) return;
        const exportData = list.map((item: any, index: number) => ({
          'S.No': index + 1,
          'Branch': item['Branch'],
          'TC Name': item['TC Name'],
          'Employee ID': item['TC Employee ID'],
          'Donor Name': item['Donor Name'],
          'Phone Number': item['Phone Number'],
          'DOB': item['DOB'],
          'Anniversary': item['Anniversary'] || '',
          'Base Type': item['Base Type'],
          'Assigned Date': item['Assigned Date'],
          'Call Completed Date': item['Call Completed Date'],
          'Call Disposition': item['Call Disposition'],
          'Remarks': item['Remarks']
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'TL Call Logs');
        const fileName = `TL_CallLogs_${this.tlFilterStartDate()}_to_${this.tlFilterEndDate()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      },
      error: (err) => {
        console.error('Error downloading export data', err);
        this.tlIsDownloading.set(false);
      }
    });
  }
}
