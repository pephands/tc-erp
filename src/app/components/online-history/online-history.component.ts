import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { OnlinePaymentRecord } from '../../models/payment.model';
import * as XLSX from 'xlsx';
import { AddOnlinePaymentModalComponent } from '../../modals/add-online-payment-modal/add-online-payment-modal.component';

@Component({
  selector: 'app-online-history',
  standalone: true,
  imports: [CommonModule, FormsModule, AddOnlinePaymentModalComponent],
  providers: [DatePipe],
  templateUrl: './online-history.component.html',
  styleUrl: './online-history.component.css'
})
export class OnlineHistoryComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private branchService = inject(BranchListService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private datePipe = inject(DatePipe);

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  exportLoaderMessage = signal<string>('Fetching records from server... Please wait.');

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  minDate = signal<string>('');
  maxDate = signal<string>('');
  statusFilter = signal<string>('');
  branchFilter = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Auth & Roles
  isAdmin = signal<boolean>(false);
  isManager = signal<boolean>(false);
  isTL = signal<boolean>(false);
  isOT = signal<boolean>(false);
  branches = signal<any[]>([]);

  canExportXLSX = computed(() => this.isAdmin() || this.isTL() || this.isOT());
  canEdit = computed(() => this.isAdmin() || this.isOT());

  // Edit modal state (Admin & Online Payment Team only)
  showEditModal = signal<boolean>(false);
  editRecord = signal<OnlinePaymentRecord | null>(null);

  // Pagination
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

  ngOnInit(): void {
    this.checkUserRole();
    this.fetchApprovedRecords();
  }

  checkUserRole(): void {
    const isSuper = !!this.authService.currentUser()?.is_superuser;
    this.isAdmin.set(isSuper || this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
    this.isManager.set(this.authService.hasRole(['MANAGER']));
    this.isTL.set(this.authService.hasRole(['TL', 'TEAM LEAD', 'TEAM LEADER']));
    this.isOT.set(this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM']));

    if (!this.isAdmin() && !this.isManager() && !this.isTL() && !this.isOT()) {
      const today = new Date();
      const endStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

      this.startDate.set(startStr);
      this.endDate.set(endStr);
      this.minDate.set(startStr);
      this.maxDate.set(endStr);
    }

    if (this.isAdmin() || this.isManager() || this.isOT() || this.isTL()) {
      if (this.isTL() && !this.isAdmin() && !this.isManager() && !this.isOT()) {
        const userBranchId = this.authService.currentUser()?.branch?.id;
        if (userBranchId) {
          this.branchFilter.set(String(userBranchId));
        }
      }
      this.fetchBranches();
    }
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  fetchBranches(): void {
    // Only fetch active, non-trust branches (is_trust=false)
    this.branchService.getData(1, 1000, '', 'true', 'false').subscribe({
      next: (res: any) => {
        let branchList: any[] = [];
        if (res && res.data) {
          branchList = res.data;
        } else if (res && res.results) {
          branchList = res.results;
        } else if (Array.isArray(res)) {
          branchList = res;
        }

        // Strict guard: ensure only branches with is_trust == false are included
        branchList = branchList.filter((b: any) => !b.is_trust);

        // For TL role, strictly show only their assigned branch and exclude trust branches
        if (this.isTL() && !this.isAdmin() && !this.isManager() && !this.isOT()) {
          const userBranchId = this.authService.currentUser()?.branch?.id;
          branchList = branchList.filter((b: any) => !b.is_trust && (!userBranchId || b.id === userBranchId));
          if (userBranchId) {
            this.branchFilter.set(String(userBranchId));
          }
        }
        this.branches.set(branchList);
      },
      error: (err: any) => {
        console.error('Error fetching branches:', err);
      }
    });
  }

  fetchApprovedRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();

    const status = this.statusFilter();
    const branch = this.branchFilter();

    this.paymentService.getRecords(
      status,
      search,
      start,
      end,
      page,
      '',
      false,
      branch,
      false,
      '',
      '',
      this.pageSize(),
      '',
      'false' // Exclude trust branches (only branch is_trust == false)
    ).subscribe({
      next: (res: any) => {
        let items: OnlinePaymentRecord[] = [];
        let count = 0;

        if (res && res.results) {
          items = res.results;
          count = res.count || items.length;
        } else if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
          count = items.length;
        } else if (Array.isArray(res)) {
          items = res;
          count = items.length;
        }

        // Strictly exclude any trust branch records
        items = items.filter((rec: any) => !rec.branch_is_trust);

        this.records.set(items);
        this.totalCount.set(count);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching approved payment records:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Filter Handlers
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onStatusChange(val: string): void {
    this.statusFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onBranchChange(val: string): void {
    this.branchFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    if (!this.isAdmin() && !this.isManager() && !this.isOT()) {
      const today = new Date();
      const endStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      this.startDate.set(startStr);
      this.endDate.set(endStr);
    } else {
      this.startDate.set('');
      this.endDate.set('');
    }
    this.statusFilter.set('');
    if (this.isTL() && !this.isAdmin() && !this.isManager() && !this.isOT()) {
      const userBranchId = this.authService.currentUser()?.branch?.id;
      this.branchFilter.set(userBranchId ? String(userBranchId) : '');
    } else {
      this.branchFilter.set('');
    }
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchApprovedRecords();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || this.startDate() || this.endDate() || this.statusFilter() || this.branchFilter()));
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchApprovedRecords();
    }
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchApprovedRecords();
    }
  }



  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchApprovedRecords();
    }
  }

  // Edit Handlers (Restricted to Admin and Online Payment Team)
  onEdit(rec: OnlinePaymentRecord): void {
    if (!this.canEdit()) {
      this.toastService.warning('Unauthorized', 'Only Admin and Online Payment Team can edit records.');
      return;
    }
    this.editRecord.set(rec);
    this.showEditModal.set(true);
  }

  onModalClose(): void {
    this.showEditModal.set(false);
    this.editRecord.set(null);
  }

  onModalSubmit(): void {
    this.showEditModal.set(false);
    this.editRecord.set(null);
    this.toastService.success('Record Updated', 'Payment record updated successfully.');
    this.fetchApprovedRecords();
  }

  exportToXLSX(): void {
    if (!this.canExportXLSX()) {
      this.toastService.warning('Unauthorized', 'Only TL, Online Payment Team, and Admin roles can export records.');
      return;
    }

    if (this.isExporting()) return;

    this.isExporting.set(true);
    this.exportLoaderMessage.set('Fetching records from server... Please wait.');
    this.toastService.info('Export Started', 'Preparing online history records for download...');

    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const status = this.statusFilter();
    const branch = this.branchFilter();

    this.paymentService.getRecords(
      status,
      search,
      start,
      end,
      1,
      '',
      false,
      branch,
      true, // isExport
      '',
      '',
      10,
      '',
      'false' // Exclude trust branches
    ).subscribe({
      next: (res: any) => {
        let items: OnlinePaymentRecord[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (res && res.results) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        }

        // Strictly exclude any trust branch records
        items = items.filter((rec: any) => !rec.branch_is_trust);

        if (!items || items.length === 0) {
          this.toastService.warning('No Records', 'No payment records found for the selected filter.');
          this.isExporting.set(false);
          return;
        }

        this.exportLoaderMessage.set(`Building Excel worksheet for ${items.length.toLocaleString()} records...`);

        setTimeout(() => {
          try {
            const exportData = items.map(rec => {
              const approvedDate = rec.approved_at
                ? (this.datePipe.transform(rec.approved_at, 'yyyy-MM-dd HH:mm') || rec.approved_at)
                : (rec.created_at ? (this.datePipe.transform(rec.created_at, 'yyyy-MM-dd HH:mm') || rec.created_at) : '-');

              return {
                'Approved Date': approvedDate,
                'Donation Date': rec.payment_date || '-',
                'Branch': rec.branch_name || '-',
                'EMP Name': rec.telecaller_name || '-',
                'EMP ID': rec.telecaller_employee_Id || '-',
                'Receipt Id': rec.receipt_id || '-',
                'Donor Number': rec.mobile_number || '-',
                'Alt Mobile Number': rec.alt_mobile_number || '-',
                'Donor Name': rec.donor_name || '-',
                'Correction Name': rec.correction_name || '-',
                'Amount': Number(rec.amount) || rec.amount || 0,
                'Ref Id': rec.reference_id || '-',
                'Payment Mode': rec.mode_of_payment || '-',
                'Donor Type': rec.donor_type || '-',
                'Donation Type': rec.donation_type || 'Amount',
                'PAN Number': rec.pan_number || '-',
                'DOB': rec.dob || '-',
                'Address': rec.address || '-',
                'Remarks': rec.remarks || '-',
                'Status': rec.status || 'PENDING'
              };
            });

            const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
            ws['!cols'] = [
              { wch: 18 }, // Approved Date
              { wch: 14 }, // Donation Date
              { wch: 18 }, // Branch
              { wch: 22 }, // EMP Name
              { wch: 12 }, // EMP ID
              { wch: 14 }, // Receipt Id
              { wch: 15 }, // Donor Number
              { wch: 15 }, // Alt Mobile Number
              { wch: 24 }, // Donor Name
              { wch: 20 }, // Correction Name
              { wch: 12 }, // Amount
              { wch: 16 }, // Ref Id
              { wch: 14 }, // Payment Mode
              { wch: 12 }, // Donor Type
              { wch: 14 }, // Donation Type
              { wch: 14 }, // PAN Number
              { wch: 12 }, // DOB
              { wch: 30 }, // Address
              { wch: 25 }, // Remarks
              { wch: 12 }, // Status
            ];

            const wb: XLSX.WorkBook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Online_History');
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Online_Payment_History_${dateStr}.xlsx`);

            this.toastService.success('Export Complete', `Successfully exported ${items.length.toLocaleString()} records.`);
          } catch (err) {
            console.error('Error generating Excel worksheet:', err);
            this.toastService.error('Export Error', 'Failed to generate Excel file.');
          } finally {
            this.isExporting.set(false);
          }
        }, 50);
      },
      error: (err: any) => {
        console.error('Error exporting online payment history:', err);
        this.toastService.error('Export Failed', 'Failed to export records. Please try again.');
        this.isExporting.set(false);
      }
    });
  }
}

