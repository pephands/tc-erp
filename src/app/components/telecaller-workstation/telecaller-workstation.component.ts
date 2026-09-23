import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { TelecallingService } from '../../services/telecalling.service';
import { MasterDonorRecord } from '../../models/telecalling.model';

@Component({
  selector: 'app-telecaller-workstation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './telecaller-workstation.component.html',
  styleUrl: './telecaller-workstation.component.css',
})
export class TelecallerWorkstationComponent implements OnInit {
  private service = inject(TelecallingService);

  queue = this.service.tcQueueSignal;

  // Search & Server Pagination State
  activeTab = signal<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);
  totalPagesSignal = signal<number>(1);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Toast notification
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  // Call Modal State
  selectedDonor = signal<MasterDonorRecord | null>(null);
  isCallModalOpen = signal<boolean>(false);

  // Call Modal Form Inputs
  donorNameInput = signal<string>('');
  dobInput = signal<string>('');
  callDisposition = signal<string>('');
  remarksInput = signal<string>('');

  dispositionOptions = signal<{value: string, label: string}[]>([]);

  ngOnInit(): void {
    this.fetchQueue();
    this.fetchCallDispositions();
  }

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
    setTimeout(() => {
      this.showToast.set(false);
    }, 4000);
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

  // Open Call Action Modal
  onOpenCallModal(donor: MasterDonorRecord): void {
    if (!this.isRowEditable(donor)) return;

    this.selectedDonor.set(donor);
    this.donorNameInput.set(donor.donorName);
    this.dobInput.set(donor.dob || '');
    this.callDisposition.set('');
    this.remarksInput.set('');
    this.isCallModalOpen.set(true);
  }

  isRowEditable(donor: MasterDonorRecord): boolean {
    if (donor.status === 'ASSIGNED_TO_TC') {
      return true;
    } else {
      // Completed calls only editable if updated today
      if (!donor.updatedAt) return false;
      const today = new Date().toISOString().slice(0, 10);
      return donor.updatedAt.slice(0, 10) === today;
    }
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

  setTab(tab: 'PENDING' | 'COMPLETED' | 'ALL'): void {
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
          'Call Completed Date': ((this.activeTab() === 'COMPLETED' || this.activeTab() === 'ALL') && item.status === 'COMPLETED' && item.updatedAt) ? item.updatedAt.slice(0, 10) : '',
          'Call Disposition': item.latestCallDisposition || '',
          'Remarks': item.latestCallRemarks || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        const sheetName = this.activeTab() === 'PENDING' ? 'Pending Donors' : (this.activeTab() === 'COMPLETED' ? 'Completed Donors' : 'All Donors');
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
}


