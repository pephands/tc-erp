import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../services/payment.service';
import { BranchListService } from '../../../services/branch-list.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
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
  private toastService = inject(ToastService);
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private http = inject(HttpClient);

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);
  isZipping = signal<boolean>(false);
  zipProgress = signal<string>('');
  zipElapsedTime = signal<number>(0);
  private zipTimer: any = null;
  showEditModal = signal<boolean>(false);
  editRecord = signal<OnlinePaymentRecord | null>(null);

  // Tabs
  activeTab = signal<string>('All'); // 'All', 'Amount', or 'Goodies'
  isSuperintendent = signal<boolean>(false);

  filteredRecords = computed(() => {
    return this.records();
  });

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  branchFilter = signal<string>('');
  panStatusFilter = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Auth & Roles
  isAdmin = signal<boolean>(false);
  isManager = signal<boolean>(false);
  isTL = signal<boolean>(false);
  isTC = signal<boolean>(false);
  isPR = signal<boolean>(false);
  branches = signal<any[]>([]);

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
    this.fetchReceiptRecords();
  }

  checkUserRole(): void {
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
    this.isManager.set(this.authService.hasRole(['MANAGER']));
    this.isTL.set(this.authService.hasRole(['TL', 'TEAM LEADER']));
    this.isSuperintendent.set(this.authService.hasRole(['SUPERINTENDENT']));
    this.isPR.set(this.authService.hasRole(['PUBLIC_RELATIONS']));
    this.isTC.set(!this.isAdmin() && !this.isManager() && !this.isTL() && !this.isSuperintendent() && !this.isPR());

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

    if (this.isAdmin() || this.isManager() || this.isTL() || this.isPR()) {
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
        
        if (this.isPR()) {
          this.branches.set(this.branches().filter((b: any) => b.is_trust === true));
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
    const panStatus = this.panStatusFilter();
    const donationType = this.activeTab();

    // For Receipts: list only status 'OK'.
    const status = 'OK';

    this.paymentService.getRecords(status, search, start, end, page, '', false, branch, false, panStatus, donationType).subscribe({
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
  onTabChange(val: string): void {
    this.activeTab.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

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

  onPanStatusChange(val: string): void {
    this.panStatusFilter.set(val);
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
    this.panStatusFilter.set('');
    this.activeTab.set('All');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchReceiptRecords();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(!!(this.searchQuery() || (this.startDate() && !this.isTC()) || (this.endDate() && !this.isTC()) || this.branchFilter() || this.activeTab() !== 'All' || this.panStatusFilter()));
  }

  // Pagination Handlers
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchReceiptRecords();
    }
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
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
    const panStatus = this.panStatusFilter();
    const donationType = this.activeTab();
    const status = 'OK';

    this.paymentService.getRecords(status, search, start, end, 1, '', false, branch, true, panStatus, donationType).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        const exportData = items.map(rec => ({
          'Date': this.datePipe.transform(rec.created_at, 'yyyy-MM-dd hh:mm a') || rec.created_at,
          'Receipt ID': rec.receipt_id || '-',
          'Receipt Url': rec.generated_receipt_url || '-',
          'Branch': rec.branch_name || '-',
          'TC Name': rec.telecaller_name || '-',
          'EMP ID': rec.telecaller_employee_Id || '-',
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

  formatZipTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatETA(totalSeconds: number): string {
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  async onExportPDFZip(): Promise<void> {
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const branch = this.branchFilter();
    const panStatus = this.panStatusFilter();
    const donationType = this.activeTab();
    const status = 'OK';

    this.isZipping.set(true);
    this.zipProgress.set('Fetching records...');
    this.zipElapsedTime.set(0);
    
    if (this.zipTimer) clearInterval(this.zipTimer);
    this.zipTimer = setInterval(() => {
      this.zipElapsedTime.update(v => v + 1);
    }, 1000);

    this.paymentService.getRecords(status, search, start, end, 1, '', false, branch, true, panStatus, donationType).subscribe({
      next: async (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        // Apply strict filter: only Amount donation_type and OK status
        const pdfItems = items.filter(r => 
          ((r.donation_type === 'Amount') || (!r.donation_type)) && 
          r.status === 'OK'
        );

        if (pdfItems.length === 0) {
          this.zipProgress.set('No Amount receipts found for this filter.');
          if (this.zipTimer) clearInterval(this.zipTimer);
          setTimeout(() => {
            this.isZipping.set(false);
            this.zipProgress.set('');
          }, 3000);
          return;
        }

        const zip = new JSZip();
        let downloadedCount = 0;
        const total = pdfItems.length;
        
        // Batch configuration for faster yet safe processing
        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_BATCHES_MS = 300;
        
        const startTime = Date.now();

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = pdfItems.slice(i, i + BATCH_SIZE);
          
          let progressStr = `Downloading ${downloadedCount}/${total}...`;
          if (downloadedCount > 0) {
            const elapsed = Date.now() - startTime;
            const avgTimePerItem = elapsed / downloadedCount;
            const remainingItems = total - downloadedCount;
            const etaSeconds = Math.ceil((avgTimePerItem * remainingItems) / 1000);
            progressStr += ` (Est. ${this.formatETA(etaSeconds)} remaining)`;
          }
          this.zipProgress.set(progressStr);
          
          const promises = batch.map(async (rec) => {
            try {
              // Use paymentService.downloadReceipt to trigger backend generation if missing
              const blob = await this.paymentService.downloadReceipt(rec.id).toPromise();
              if (blob) {
                const fileName = rec.receipt_id ? `${rec.receipt_id}.pdf` : `receipt_${rec.id}.pdf`;
                zip.file(fileName, blob);
                downloadedCount++;
              }
            } catch (e) {
              console.error('Failed to download PDF for:', rec.receipt_id, e);
            }
          });

          await Promise.all(promises);

          // Give the server a small breather
          if (i + BATCH_SIZE < total) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
          }
        }

        if (downloadedCount > 0) {
          this.zipProgress.set('Zipping files...');
          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, `Receipts_PDFs_${new Date().toISOString().slice(0, 10)}.zip`);
          this.zipProgress.set(`Success! Downloaded ${downloadedCount} receipts.`);
        } else {
          this.zipProgress.set('Failed to download any PDFs.');
        }

        if (this.zipTimer) clearInterval(this.zipTimer);
        setTimeout(() => {
          this.isZipping.set(false);
          this.zipProgress.set('');
        }, 3000);
      },
      error: (err: any) => {
        console.error('Error fetching receipts for zip:', err);
        this.zipProgress.set('Failed to fetch receipts for export.');
        if (this.zipTimer) clearInterval(this.zipTimer);
        setTimeout(() => {
          this.isZipping.set(false);
          this.zipProgress.set('');
        }, 3000);
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
    this.paymentService.sendWhatsappReceipt(record.id).subscribe({
      next: (res) => {
        this.toastService.success('WhatsApp Receipt', 'WhatsApp receipt sent successfully!');
      },
      error: (err) => {
        this.toastService.error('Send Failed', err.error?.error || 'Failed to send WhatsApp receipt.');
      }
    });
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
