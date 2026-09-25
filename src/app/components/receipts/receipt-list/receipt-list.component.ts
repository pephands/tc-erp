import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../services/payment.service';
import { BranchListService } from '../../../services/branch-list.service';
import { AuthService } from '../../../services/auth.service';
import { OnlinePaymentRecord } from '../../../models/payment.model';
import { AddOnlinePaymentModalComponent } from '../../../modals/add-online-payment-modal/add-online-payment-modal.component';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddOnlinePaymentModalComponent],
  providers: [DatePipe],
  templateUrl: './receipt-list.component.html',
  styleUrl: './receipt-list.component.css'
})
export class ReceiptListComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private branchService = inject(BranchListService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private datePipe = inject(DatePipe);

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  editRecord = signal<OnlinePaymentRecord | null>(null);

  // Tabs
  activeTab = signal<string>('All'); // 'All', 'Amount', or 'Goodies'
  isSuperintendent = signal<boolean>(false);

  filteredRecords = computed(() => {
    let recs = this.records();
    if (this.isSuperintendent() && this.activeTab() !== 'All') {
      recs = recs.filter(r => (r as any).donation_type === this.activeTab() || (!((r as any).donation_type) && this.activeTab() === 'Amount'));
    }
    return recs;
  });

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  branchFilter = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Auth & Roles
  isAdmin = signal<boolean>(false);
  isManager = signal<boolean>(false);
  isTL = signal<boolean>(false);
  isTC = signal<boolean>(false);
  branches = signal<any[]>([]);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  ngOnInit(): void {
    this.checkUserRole();
    this.fetchReceiptRecords();
  }

  checkUserRole(): void {
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
    this.isManager.set(this.authService.hasRole(['MANAGER']));
    this.isTL.set(this.authService.hasRole(['TL', 'TEAM LEADER']));
    this.isSuperintendent.set(this.authService.hasRole(['SUPERINTENDENT']));
    this.isTC.set(!this.isAdmin() && !this.isManager() && !this.isTL() && !this.isSuperintendent());

    if (this.isTC()) {
      const today = new Date();
      const endStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      this.startDate.set(startStr);
      this.endDate.set(endStr);
    } else if (this.isSuperintendent()) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      this.startDate.set(this.formatDate(firstDay));
      this.endDate.set(this.formatDate(lastDay));
    }

    if (this.isAdmin() || this.isManager() || this.isTL()) {
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
    this.branchService.getData(1, 100).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.branches.set(res.results);
        } else if (res && res.data) {
          this.branches.set(res.data);
        } else if (Array.isArray(res)) {
          this.branches.set(res);
        }
      },
      error: (err: any) => {
        console.error('Error fetching branches:', err);
      }
    });
  }

  fetchReceiptRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();
    const branch = this.branchFilter();

    // For Receipts: list only status 'OK'.
    const status = 'OK';

    this.paymentService.getRecords(status, search, start, end, page, '', false, branch).subscribe({
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

        this.records.set(items);
        this.totalCount.set(count);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching receipt records:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Filter Handlers
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

  onBranchChange(val: string): void {
    this.branchFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    if (this.isTC()) {
      const today = new Date();
      const endStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      this.startDate.set(startStr);
      this.endDate.set(endStr);
    } else if (this.isSuperintendent()) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.startDate.set(this.formatDate(firstDay));
      this.endDate.set(this.formatDate(lastDay));
    } else {
      this.startDate.set('');
      this.endDate.set('');
    }
    this.branchFilter.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || (this.startDate() && !this.isTC()) || (this.endDate() && !this.isTC()) || this.branchFilter()));
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchReceiptRecords();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchReceiptRecords();
    }
  }

  onExportExcel(): void {
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const branch = this.branchFilter();
    const status = 'OK';

    this.paymentService.getRecords(status, search, start, end, 1, '', false, branch, true).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        if (this.isSuperintendent() && this.activeTab() !== 'All') {
          items = items.filter(r => (r.donation_type || 'Amount') === this.activeTab());
        }

        const exportData = items.map(rec => ({
          'Date': this.datePipe.transform(rec.created_at, 'yyyy-MM-dd hh:mm a') || rec.created_at,
          'Donor Number': rec.mobile_number,
          'Donor Name': rec.donor_name,
          'Donation Type': rec.donation_type || 'Amount',
          'Amount': rec.amount,
          'Ref Id': rec.reference_id,
          'Remarks': rec.remarks || '-',
          'Status': rec.status || 'OK'
        }));

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Receipts');
        XLSX.writeFile(wb, `Receipts_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      error: (err: any) => {
        console.error('Error exporting receipts:', err);
        alert('Failed to export receipts.');
      }
    });
  }

  onCreateReceipt(): void {
    this.router.navigate(['/receipts/create']);
  }

  // Actions
  onView(record: OnlinePaymentRecord) {
    this.paymentService.downloadReceipt(record.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => {
        alert('Failed to view receipt. It might not be available.');
      }
    });
  }

  onDownload(record: OnlinePaymentRecord) {
    this.paymentService.downloadReceipt(record.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${record.receipt_id || record.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Failed to download receipt. It might not be available.');
      }
    });
  }

  onSendWhatsApp(record: OnlinePaymentRecord) {
    const url = record.generated_receipt_url || record.payment_proof_url || '';
    const msg = `Dear ${record.donor_name}, Thank you for your payment of Rs. ${record.amount}. Your receipt: ${url}`;
    window.open(`https://wa.me/91${record.mobile_number}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  onSendMail(record: OnlinePaymentRecord) {
    const url = record.generated_receipt_url || record.payment_proof_url || '';
    const subject = `Payment Receipt - ${record.reference_id}`;
    const body = `Dear ${record.donor_name},\n\nThank you for your payment of Rs. ${record.amount}.\n\nYou can view your receipt here: ${url}\n\nThank you.`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  onEdit(record: OnlinePaymentRecord) {
    this.editRecord.set(record);
    this.showEditModal.set(true);
  }

  onDelete(record: OnlinePaymentRecord) {
    if (confirm('Are you sure you want to completely delete this receipt? This action cannot be undone.')) {
      this.paymentService.deleteReceipt(record.id).subscribe({
        next: () => {
          alert('Receipt deleted successfully.');
          this.fetchReceiptRecords();
        },
        error: (err: any) => {
          console.error('Error deleting receipt:', err);
          alert('Failed to delete the receipt.');
        }
      });
    }
  }

  onModalClose() {
    this.showEditModal.set(false);
    this.editRecord.set(null);
  }

  onModalSubmit() {
    this.showEditModal.set(false);
    this.editRecord.set(null);
    this.fetchReceiptRecords();
  }
}
