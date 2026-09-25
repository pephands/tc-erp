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

  activeTab = signal<'PENDING' | 'COMPLETED'>('PENDING');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
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
  dobInput = signal<string>('');
  callDisposition = signal<string>('');
  remarksInput = signal<string>('');

  dispositionOptions = signal<{value: string, label: string}[]>([]);

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
  tlFilterDate = signal<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  );
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
    const queueType = this.activeTab().toLowerCase();

    this.service.fetchTcQueue(page, size, search, queueType).subscribe({
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
    this.dobInput.set(donor.dob || '');
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

  onSubmitCallLog(): void {
    const donor = this.selectedDonor();
    if (!donor) return;
    const disposition = this.callDisposition();
    const remarks = this.remarksInput().trim();
    const updatedName = this.donorNameInput().trim();
    const updatedDob = this.dobInput().trim();

    if (!disposition) {
      alert('Please select a Call Disposition.');
      return;
    }

    this.isSubmitting.set(true);
    this.service.logCall(donor.id, disposition, remarks, updatedName, updatedDob).subscribe({
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
        alert(msg);
      },
    });
  }

  setTab(tab: 'PENDING' | 'COMPLETED'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.fetchQueue();
  }

  onDownloadAssignedData(): void {
    const search = this.searchQuery().trim();
    const queueType = this.activeTab().toLowerCase();
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
          'Assigned Date': item.assignedTcAt ? item.assignedTcAt.slice(0, 10) : (item.createdAt ? item.createdAt.slice(0, 10) : ''),
          'Call Completed Date': (this.activeTab() === 'COMPLETED' && item.status === 'COMPLETED' && item.updatedAt) ? item.updatedAt.slice(0, 10) : '',
          'Call Disposition': item.latestCallDisposition || '',
          'Remarks': item.latestCallRemarks || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        const sheetName = this.activeTab() === 'PENDING' ? 'Pending Donors' : 'Completed Donors';
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        const fileName = `${this.activeTab()}_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    this.service.fetchTlWorkstation(this.tlFilterDate(), this.tlSearchQuery(), this.selectedBranch(), this.tlCurrentPage()).subscribe({
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

  downloadTlExcel(): void {
    this.tlIsDownloading.set(true);
    this.service.fetchTlWorkstationExport(this.tlFilterDate(), this.tlSearchQuery(), this.selectedBranch()).subscribe({
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
          'Donor Name': item['Donor Name'],
          'Phone Number': item['Phone Number'],
          'DOB': item['DOB'],
          'Assigned Date': item['Assigned Date'],
          'Call Completed Date': item['Call Completed Date'],
          'Call Disposition': item['Call Disposition'],
          'Remarks': item['Remarks']
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'TL Call Logs');
        const fileName = `TL_CallLogs_${this.tlFilterDate()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      },
      error: (err) => {
        console.error('Error downloading export data', err);
        this.tlIsDownloading.set(false);
      }
    });
  }
}
