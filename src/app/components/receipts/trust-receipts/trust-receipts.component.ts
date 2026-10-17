import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PaymentService } from '../../../services/payment.service';
import { BranchListService } from '../../../services/branch-list.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { OnlinePaymentRecord } from '../../../models/payment.model';
import { AddOnlinePaymentModalComponent } from '../../../modals/add-online-payment-modal/add-online-payment-modal.component';

@Component({
  selector: 'app-trust-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, AddOnlinePaymentModalComponent],
  providers: [DatePipe],
  templateUrl: './trust-receipts.component.html',
  styleUrl: './trust-receipts.component.css'
})
export class TrustReceiptsComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private branchService = inject(BranchListService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private datePipe = inject(DatePipe);
  private router = inject(Router);

  // Data & State
  records = signal<OnlinePaymentRecord[]>([]);
  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  isZipping = signal<boolean>(false);
  zipProgress = signal<string>('');
  zipElapsedTime = signal<number>(0);
  private zipTimer: any = null;

  // Edit Modal State
  showEditModal = signal<boolean>(false);
  editRecord = signal<OnlinePaymentRecord | null>(null);

  // Donation Type Filter ('All', 'Amount', 'Goodies')
  donationTypeFilter = signal<string>('All');

  // Filters
  searchQuery = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  branchFilter = signal<string>('');
  panStatusFilter = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Trust Branches
  branches = signal<any[]>([]);

  // Roles & Auth
  isAdmin = signal<boolean>(false);
  isManager = signal<boolean>(false);
  isOT = signal<boolean>(false);
  isPR = signal<boolean>(false);
  isTC = signal<boolean>(false);
  isTL = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxButtons = 5;
    const pages: number[] = [];

    if (total <= maxButtons) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      let start = Math.max(1, current - 2);
      let end = Math.min(total, current + 2);

      if (start === 1) end = Math.min(total, maxButtons);
      if (end === total) start = Math.max(1, total - maxButtons + 1);

      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.initRoles();
    this.fetchTrustBranches();
    this.fetchTrustReceipts();
  }

  private initRoles(): void {
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR', 'TCT']));
    this.isManager.set(this.authService.hasRole(['MANAGER']));
    this.isOT.set(this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM']));
    this.isTL.set(this.authService.hasRole(['TL', 'TEAM LEADER', 'TEAM LEAD']) && !this.isAdmin());
    this.isPR.set(this.authService.hasRole(['PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER']));
    this.isTC.set(this.authService.hasRole(['TC', 'TELECALLER', 'TELE CALLER']) || (!this.isAdmin() && !this.isManager() && !this.isTL() && !this.isPR() && !this.isOT()));
  }

  fetchTrustBranches(): void {
    this.branchService.getData(1, 1000, '', 'true', 'true').subscribe({
      next: (res: any) => {
        let allBranches: any[] = [];
        if (res && res.results) {
          allBranches = res.results;
        } else if (res && res.data) {
          allBranches = res.data;
        } else if (Array.isArray(res)) {
          allBranches = res;
        }
        // Strict filter: only trust branches
        let trustBranches = allBranches.filter((b: any) => b.is_trust === true);
        if (this.isPR()) {
          const userBranchId = this.authService.currentUser()?.branch?.id;
          if (userBranchId) {
            trustBranches = trustBranches.filter((b: any) => b.id === userBranchId);
            this.branchFilter.set(String(userBranchId));
          }
        }
        this.branches.set(trustBranches);
      },
      error: (err: any) => {
        console.error('Error fetching trust branches:', err);
      }
    });
  }

  fetchTrustReceipts(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const branch = this.branchFilter();
    const panStatus = this.panStatusFilter();
    const donationType = this.donationTypeFilter();

    this.paymentService.getTrustReceipts(
      search,
      start,
      end,
      this.currentPage(),
      branch,
      false,
      panStatus,
      donationType,
      this.pageSize()
    ).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res && res.results) {
          this.records.set(res.results);
          this.totalCount.set(res.count || 0);
        } else if (res && res.data) {
          this.records.set(Array.isArray(res.data) ? res.data : [res.data]);
          this.totalCount.set(res.count || this.records().length);
        } else if (Array.isArray(res)) {
          this.records.set(res);
          this.totalCount.set(res.length);
        } else {
          this.records.set([]);
          this.totalCount.set(0);
        }
      },
      error: (err: any) => {
        this.isLoading.set(false);
        console.error('Error fetching trust receipts:', err);
        this.toastService.error('Load Failed', 'Could not load trust receipts.');
      }
    });
  }

  // Filter Change Handlers
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  onBranchChange(val: string): void {
    this.branchFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  onDonationTypeChange(val: string): void {
    this.donationTypeFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  onPanStatusChange(val: string): void {
    this.panStatusFilter.set(val);
    this.updateFilterState();
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.branchFilter.set('');
    this.panStatusFilter.set('');
    this.donationTypeFilter.set('All');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchTrustReceipts();
  }

  private updateFilterState(): void {
    this.isFilterApplied.set(
      !!(
        this.searchQuery() ||
        this.startDate() ||
        this.endDate() ||
        this.branchFilter() ||
        this.donationTypeFilter() !== 'All' ||
        this.panStatusFilter()
      )
    );
  }

  // Pagination Handlers
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchTrustReceipts();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchTrustReceipts();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchTrustReceipts();
    }
  }

  // Edit Handlers
  canEdit(rec: OnlinePaymentRecord): boolean {
    if (this.isAdmin() || this.isManager() || this.isOT()) return true;
    if (this.isPR()) {
      if (!rec.created_at) return false;
      const today = new Date();
      const recDate = new Date(rec.created_at);
      return today.toDateString() === recDate.toDateString();
    }
    return false;
  }

  canDeleteReceiptFile(rec: OnlinePaymentRecord): boolean {
    return (this.isAdmin() || this.isOT()) && (rec.donation_type || 'Amount') === 'Amount' && !!(rec.generated_receipt || rec.generated_receipt_url);
  }

  onDeleteReceiptFile(record: OnlinePaymentRecord): void {
    if (confirm('Are you sure you want to delete the existing receipt file for this record? (The record details will be kept, and you can edit or regenerate the receipt).')) {
      this.paymentService.deleteTrustReceiptFile(record.id).subscribe({
        next: (res: any) => {
          this.toastService.success('Receipt File Deleted', res.message || 'Receipt file deleted successfully.');
          this.fetchTrustReceipts();
        },
        error: (err: any) => {
          console.error('Error deleting trust receipt file:', err);
          this.toastService.error('Delete Failed', err.error?.message || 'Failed to delete the receipt file.');
        }
      });
    }
  }

  onEdit(record: OnlinePaymentRecord): void {
    this.editRecord.set(record);
    this.showEditModal.set(true);
  }

  onModalClose(): void {
    this.showEditModal.set(false);
    this.editRecord.set(null);
  }

  onModalSubmit(): void {
    this.showEditModal.set(false);
    this.editRecord.set(null);
    this.toastService.success('Updated', 'Receipt updated successfully.');
    this.fetchTrustReceipts();
  }

  // Single Receipt Actions (Amount only)
  onView(record: OnlinePaymentRecord): void {
    if (record.donation_type === 'Goodies') {
      this.toastService.info('Notice', 'Receipts are not available for Goodies donations.');
      return;
    }

    if (record.generated_receipt) {
      window.open(record.generated_receipt, '_blank');
    } else {
      this.toastService.info('Generating', 'Generating trust receipt, please wait...');
      this.paymentService.downloadTrustReceipt(record.id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          this.fetchTrustReceipts();
        },
        error: (err) => {
          console.error('Error generating trust receipt:', err);
          this.toastService.error('View Failed', 'Failed to generate receipt on backend.');
        }
      });
    }
  }

  onDownload(record: OnlinePaymentRecord): void {
    if (record.donation_type === 'Goodies') {
      this.toastService.info('Notice', 'Receipts are not available for Goodies donations.');
      return;
    }

    if (record.generated_receipt) {
      const a = document.createElement('a');
      a.href = record.generated_receipt;
      a.target = '_blank';
      a.download = `Receipt_${record.receipt_id || record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      this.toastService.info('Generating', 'Generating trust receipt, please wait...');
      this.paymentService.downloadTrustReceipt(record.id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Receipt_${record.receipt_id || record.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.fetchTrustReceipts();
        },
        error: (err) => {
          console.error('Error downloading trust receipt:', err);
          this.toastService.error('Download Failed', 'Failed to generate receipt on backend.');
        }
      });
    }
  }

  // Export to Excel (.xlsx)
  onExportExcel(): void {
    this.isExporting.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const branch = this.branchFilter();
    const panStatus = this.panStatusFilter();
    const donationType = this.donationTypeFilter();

    this.paymentService.getTrustReceipts(
      search,
      start,
      end,
      1,
      branch,
      true,
      panStatus,
      donationType,
      this.pageSize()
    ).subscribe({
      next: (res: any) => {
        this.isExporting.set(false);
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        const exportData = items.map(rec => ({
          'Date': this.datePipe.transform(rec.created_at, 'yyyy-MM-dd hh:mm a') || rec.created_at,
          'Payment Date': rec.payment_date || '-',
          'Receipt ID': rec.receipt_id || '-',
          'Receipt URL': rec.generated_receipt_url || '-',
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
        XLSX.utils.book_append_sheet(wb, ws, 'Trust Receipts');
        XLSX.writeFile(wb, `Trust_Receipts_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.toastService.success('Export Successful', `Exported ${exportData.length} trust receipts.`);
      },
      error: (err: any) => {
        this.isExporting.set(false);
        console.error('Error exporting trust receipts:', err);
        this.toastService.error('Export Failed', 'Failed to export trust receipts.');
      }
    });
  }

  // Download PDF Zip (Amount records only)
  async onExportPDFZip(): Promise<void> {
    if (this.isZipping()) return;

    this.isZipping.set(true);
    this.zipProgress.set('Initializing...');
    this.zipElapsedTime.set(0);

    const startTime = Date.now();
    this.zipTimer = setInterval(() => {
      this.zipElapsedTime.set(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const search = this.searchQuery().trim();
      const start = this.startDate();
      const end = this.endDate();
      const branch = this.branchFilter();
      const panStatus = this.panStatusFilter();
      // Ensure we only download Amount receipts for PDF Zip
      const donationType = this.donationTypeFilter() === 'Goodies' ? 'Goodies' : 'Amount';

      if (this.donationTypeFilter() === 'Goodies') {
        this.toastService.info('Notice', 'No PDFs can be generated for Goodies donations.');
        this.cleanupZip();
        return;
      }

      this.zipProgress.set('Fetching trust records...');
      const res: any = await firstValueFrom(this.paymentService.getTrustReceipts(
        search,
        start,
        end,
        1,
        branch,
        true,
        panStatus,
        'Amount',
        10
      ));

      let items: any[] = [];
      if (res && res.data) {
        items = Array.isArray(res.data) ? res.data : [res.data];
      } else if (Array.isArray(res)) {
        items = res;
      }

      const amountItems = items.filter(r => (r.donation_type === 'Amount' || !r.donation_type) && r.status === 'OK');

      if (amountItems.length === 0) {
        this.toastService.info('No Records', 'No Amount receipts available to package.');
        this.cleanupZip();
        return;
      }

      const zip = new JSZip();
      let downloadedCount = 0;
      let processedCount = 0;
      const totalExpected = amountItems.length;
      const usedFileNames = new Set<string>();

      // Controlled concurrency pool (6 parallel downloads) for high performance without network congestion
      const CONCURRENCY = Math.min(6, totalExpected);
      let nextIndex = 0;

      const worker = async () => {
        while (nextIndex < totalExpected) {
          const index = nextIndex++;
          const rec = amountItems[index];
          if (!rec) break;

          try {
            let pdfBlob: Blob | null = null;
            const directUrl = rec.generated_receipt_url || rec.generated_receipt;
            if (directUrl) {
              try {
                const fetchRes = await fetch(directUrl);
                if (fetchRes.ok) {
                  pdfBlob = await fetchRes.blob();
                }
              } catch (e) {
                // Direct fetch fallback
              }
            }

            if (!pdfBlob) {
              try {
                pdfBlob = await firstValueFrom(this.paymentService.downloadTrustReceipt(rec.id));
              } catch (dlErr) {
                console.warn(`Failed to generate/download receipt for ${rec.id}:`, dlErr);
              }
            }

            if (pdfBlob) {
              let fileName = rec.receipt_id ? `${rec.receipt_id}.pdf` : `receipt_${rec.id}.pdf`;
              if (usedFileNames.has(fileName)) {
                fileName = `${rec.receipt_id || 'receipt'}_${rec.id}.pdf`;
              }
              usedFileNames.add(fileName);
              zip.file(fileName, pdfBlob);
              downloadedCount++;
            }
          } catch (e) {
            console.error(`Failed to package receipt for ${rec.id}:`, e);
          } finally {
            processedCount++;
            const elapsed = Date.now() - startTime;
            const avgTime = elapsed / (processedCount || 1);
            const remaining = totalExpected - processedCount;
            const etaSeconds = Math.ceil((avgTime * remaining) / 1000);
            this.zipProgress.set(
              `Downloading ${processedCount}/${totalExpected} (${downloadedCount} saved)... (Est. ${this.formatETA(etaSeconds)} remaining)`
            );
          }
        }
      };

      const workers = Array.from({ length: CONCURRENCY }, () => worker());
      await Promise.all(workers);

      if (downloadedCount === 0) {
        this.toastService.error('Zip Failed', 'Failed to retrieve receipt PDFs.');
        this.cleanupZip();
        return;
      }

      this.zipProgress.set('Compressing archive...');
      const content = await zip.generateAsync(
        { type: 'blob', compression: 'STORE' },
        (metadata) => {
          this.zipProgress.set(`Compressing archive... ${Math.round(metadata.percent)}%`);
        }
      );

      const dateSuffix = start && end ? `${start}_to_${end}` : new Date().toISOString().slice(0, 10);
      saveAs(content, `Trust_Receipts_${dateSuffix}.zip`);
      this.toastService.success('Download Complete', `Packaged all ${downloadedCount} receipts into ZIP.`);
    } catch (err: any) {
      console.error('Error generating PDF zip:', err);
      this.toastService.error('Zip Error', 'Failed to generate PDF ZIP archive.');
    } finally {
      this.cleanupZip();
    }
  }

  private cleanupZip(): void {
    if (this.zipTimer) {
      clearInterval(this.zipTimer);
      this.zipTimer = null;
    }
    this.isZipping.set(false);
    this.zipProgress.set('');
    this.zipElapsedTime.set(0);
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

  onCreateReceipt(): void {
    this.router.navigate(['/receipts/create']);
  }
}
