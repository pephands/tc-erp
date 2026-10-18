import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaymentService } from '../../../services/payment.service';
import { BranchListService } from '../../../services/branch-list.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { OnlinePaymentRecord } from '../../../models/payment.model';
import { AddOnlinePaymentModalComponent } from '../../../modals/add-online-payment-modal/add-online-payment-modal.component';
import { ReceiptGenerateComponent } from '../receipt-generate/receipt-generate.component';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AddOnlinePaymentModalComponent, ReceiptGenerateComponent],
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
  isSyncing = signal<boolean>(false);
  isZipping = signal<boolean>(false);
  zipProgress = signal<string>('');
  zipElapsedTime = signal<number>(0);
  private zipTimer: any = null;
  showEditModal = signal<boolean>(false);
  editRecord = signal<OnlinePaymentRecord | null>(null);

  selectedRecordForReceipt: OnlinePaymentRecord | null = null;
  @ViewChild('receiptGenerate') receiptGenerate!: ReceiptGenerateComponent;

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
  isTCT = signal<boolean>(false);
  isOT = signal<boolean>(false);
  isManager = signal<boolean>(false);
  isTL = signal<boolean>(false);
  isTC = signal<boolean>(false);
  isPR = signal<boolean>(false);
  branches = signal<any[]>([]);

  // Only Admin and Online Payment Team (OT) roles can view/trigger Receipt Sync
  canSyncReceipts = computed(() => {
    const isPureAdmin = (this.isAdmin() && !this.isTCT()) || this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']);
    return isPureAdmin || this.isOT();
  });

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
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR', 'TCT']));
    this.isTCT.set(this.authService.hasRole(['TCT']));
    this.isOT.set(this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM']));
    this.isManager.set(this.authService.hasRole(['MANAGER']));
    this.isTL.set(this.authService.hasRole(['TL', 'TEAM LEADER', 'TEAM LEAD']) && !this.isAdmin());
    this.isSuperintendent.set(this.authService.hasRole(['SUPERINTENDENT']));
    this.isPR.set(this.authService.hasRole(['PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER']));
    this.isTC.set(this.authService.hasRole(['TC', 'TELECALLER', 'TELE CALLER']) || (!this.isAdmin() && !this.isManager() && !this.isTL() && !this.isSuperintendent() && !this.isPR() && !this.isOT()));

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

    if (this.isAdmin() || this.isManager() || this.isTL() || this.isPR() || this.isOT()) {
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
        if (this.isTL() && !this.isAdmin() && !this.isManager()) {
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

  fetchReceiptRecords(): void {
    this.isLoading.set(true);
    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const page = this.currentPage();
    const branch = this.branchFilter();
    const panStatus = this.panStatusFilter();
    const donationType = this.activeTab();

    // For Receipts: list strictly status 'OK'
    const status = 'OK';

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
      panStatus,
      donationType,
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

  canEdit(rec: OnlinePaymentRecord): boolean {
    if (this.isAdmin() || this.isSuperintendent() || this.isOT()) return true;
    if (this.isPR()) {
      if (!rec.created_at) return false;
      const today = new Date();
      const recDate = new Date(rec.created_at);
      return today.toDateString() === recDate.toDateString();
    }
    return false;
  }

  canDeleteReceiptFile(rec: OnlinePaymentRecord): boolean {
    // Only Admin and Online Payment Team can delete existing receipt file
    return (this.isAdmin() || this.isOT()) && (rec.donation_type || 'Amount') === 'Amount' && !!(rec.generated_receipt || rec.generated_receipt_url);
  }

  canDelete(rec: OnlinePaymentRecord): boolean {
    return this.canDeleteReceiptFile(rec);
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
      panStatus,
      donationType,
      this.pageSize(),
      '',
      'false' // Exclude trust branches
    ).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        // Strictly exclude any trust branch records
        items = items.filter((rec: any) => !rec.branch_is_trust);

        const exportData = items.map(rec => ({
          'Date': this.datePipe.transform(rec.created_at, 'yyyy-MM-dd hh:mm a') || rec.created_at,
          'Payment Date': rec.payment_date || '-',
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
          'Status': rec.status || 'OK',
          'Payment Proof': rec.payment_proof_url || rec.payment_proof || '-'
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

  getFullReceiptUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = environment.baseUrl.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }

  async onExportPDFZip(): Promise<void> {
    if (this.isZipping()) return;

    const search = this.searchQuery().trim();
    const start = this.startDate();
    const end = this.endDate();
    const branch = this.branchFilter();
    const panStatus = this.panStatusFilter();
    const donationType = this.activeTab() === 'Goodies' ? 'Goodies' : 'Amount';
    const status = 'OK';

    if (this.activeTab() === 'Goodies') {
      this.toastService.info('Notice', 'No PDFs can be generated for Goodies donations.');
      return;
    }

    this.isZipping.set(true);
    this.zipProgress.set('Fetching records...');
    this.zipElapsedTime.set(0);

    if (this.zipTimer) clearInterval(this.zipTimer);
    const startTime = Date.now();
    this.zipTimer = setInterval(() => {
      this.zipElapsedTime.set(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const zip = new JSZip();
    let downloadedCount = 0;
    const usedFileNames = new Set<string>();

    try {
      let allRecords: any[] = [];
      let page = 1;

      while (true) {
        this.zipProgress.set(`Fetching page ${page}...`);
        const res: any = await firstValueFrom(
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
            panStatus,
            donationType,
            100,
            '',
            'false'
          )
        );

        let items: any[] = [];
        if (res && res.results) {
          items = res.results;
        } else if (res && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }

        items = items.filter((rec: any) => !rec.branch_is_trust);
        if (!items || items.length === 0) break;

        allRecords.push(...items);

        if (!res || !res.next || items.length < 100) break;
        page++;
      }

      // Filter to records that have receipt_id (or assignable) and are Amount
      const pdfItems = allRecords.filter(
        r => (r.donation_type === 'Amount' || !r.donation_type) && r.status === 'OK' && this.hasReceiptId(r)
      );

      if (pdfItems.length === 0) {
        this.zipProgress.set('No Amount receipts with receipt IDs found to download.');
        if (this.zipTimer) clearInterval(this.zipTimer);
        setTimeout(() => {
          this.isZipping.set(false);
          this.zipProgress.set('');
        }, 3000);
        return;
      }

      const totalExpected = pdfItems.length;
      let nextIndex = 0;
      const CONCURRENCY = Math.min(6, totalExpected);

      const worker = async () => {
        while (nextIndex < totalExpected) {
          const index = nextIndex++;
          const rec = pdfItems[index];
          if (!rec) break;

          this.zipProgress.set(`Packaging ${index + 1}/${totalExpected}... (${rec.receipt_id || rec.id})`);

          try {
            let pdfBlob: Blob | null = null;
            const directUrl = this.getFullReceiptUrl(rec.generated_receipt_url || rec.generated_receipt);

            if (directUrl) {
              try {
                const fetchRes = await fetch(directUrl);
                if (fetchRes.ok) {
                  pdfBlob = await fetchRes.blob();
                }
              } catch (e) {
                // fallback to downloadReceipt
              }
            }

            // Fallback: If not pre-generated or direct fetch failed, generate on-the-fly via backend
            if (!pdfBlob) {
              try {
                pdfBlob = await firstValueFrom(this.paymentService.downloadReceipt(rec.id));
              } catch (dlErr) {
                console.warn(`Failed to generate/download receipt for ${rec.id}:`, dlErr);
              }
            }

            if (pdfBlob) {
              let fileName = rec.receipt_id ? `Receipt_${rec.receipt_id}.pdf` : `receipt_${rec.id}.pdf`;
              if (usedFileNames.has(fileName)) {
                fileName = `Receipt_${rec.receipt_id || 'rec'}_${rec.id}.pdf`;
              }
              usedFileNames.add(fileName);
              zip.file(fileName, pdfBlob);
              downloadedCount++;
            }
          } catch (itemErr) {
            console.error('Error downloading receipt for item:', rec.id, itemErr);
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

      if (downloadedCount > 0) {
        this.zipProgress.set('Zipping files...');
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Receipts_PDFs_${new Date().toISOString().slice(0, 10)}.zip`);
        this.zipProgress.set(`Success! Downloaded ${downloadedCount} receipts.`);
      } else {
        this.zipProgress.set('Failed to download any PDFs.');
      }
    } catch (err: any) {
      console.error('Error exporting PDF zip:', err);
      this.zipProgress.set('Error packaging receipts.');
    } finally {
      if (this.zipTimer) clearInterval(this.zipTimer);
      setTimeout(() => {
        this.isZipping.set(false);
        this.zipProgress.set('');
      }, 3000);
    }
  }

  onCreateReceipt(): void {
    this.router.navigate(['/receipts/create']);
  }

  onSyncReceipts(): void {
    if (!this.canSyncReceipts()) {
      this.toastService.error('Access Denied', 'Only Admin and Online Payment Team are authorized to sync receipts.');
      return;
    }
    if (this.isSyncing()) return;
    this.isSyncing.set(true);

    const payload: any = {
      is_trust: 'false',
    };
    const branch = this.branchFilter();
    if (branch) payload.branch = branch;
    const start = this.startDate();
    if (start) payload.start_date = start;
    const end = this.endDate();
    if (end) payload.end_date = end;
    const search = this.searchQuery().trim();
    if (search) payload.search = search;
    const panStatus = this.panStatusFilter();
    if (panStatus) payload.pan_status = panStatus;
    const donationType = this.activeTab();
    if (donationType && donationType !== 'All') payload.donation_type = donationType;

    this.paymentService.syncReceipts(payload).subscribe({
      next: (res: any) => {
        if (res.status === 'up_to_date') {
          this.toastService.success('Up to Date', res.message || 'All matching receipts already generated.');
          this.isSyncing.set(false);
        } else if (res.status === 'already_running') {
          this.toastService.info('Sync in Progress', res.message || 'Receipt sync is already running in background.');
          this.pollSyncStatus(payload);
        } else {
          this.toastService.info('Sync Started', res.message || 'Receipt sync started in background.');
          this.pollSyncStatus(payload);
        }
      },
      error: (err: any) => {
        this.isSyncing.set(false);
        this.toastService.error('Sync Failed', err.error?.message || 'Failed to start receipt synchronization.');
      }
    });
  }

  private pollSyncStatus(filters?: any): void {
    const checkInterval = setInterval(() => {
      this.paymentService.getReceiptSyncStatus(filters).subscribe({
        next: (statusRes: any) => {
          const syncState = statusRes.sync_state;
          if (!syncState || !syncState.is_running) {
            clearInterval(checkInterval);
            this.isSyncing.set(false);
            const success = syncState?.success ?? 0;
            const failed = syncState?.failed ?? 0;
            this.toastService.success(
              'Sync Completed',
              `Receipt synchronization complete! Generated: ${success}${failed > 0 ? `, Failed: ${failed}` : ''}`
            );
            this.fetchReceiptRecords();
          }
        },
        error: () => {
          clearInterval(checkInterval);
          this.isSyncing.set(false);
          this.fetchReceiptRecords();
        }
      });
    }, 2500);

    // Timeout polling after 90 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (this.isSyncing()) {
        this.isSyncing.set(false);
        this.fetchReceiptRecords();
      }
    }, 90000);
  }

  hasReceiptId(record: any): boolean {
    if (!record || !record.receipt_id) return false;
    const val = String(record.receipt_id).trim();
    return val.length > 0 && val !== '-';
  }

  // Actions
  onView(record: OnlinePaymentRecord) {
    const rawUrl = record.generated_receipt_url || record.generated_receipt;
    if (rawUrl) {
      window.open(this.getFullReceiptUrl(rawUrl), '_blank');
    } else {
      this.toastService.info('Generating', 'Receipt is generating, please wait...');
      this.paymentService.downloadReceipt(record.id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          this.fetchReceiptRecords(); 
        },
        error: (err) => {
          this.toastService.error('View Failed', 'Failed to generate receipt on backend.');
        }
      });
    }
  }

  onDownload(record: OnlinePaymentRecord) {
    const rawUrl = record.generated_receipt_url || record.generated_receipt;
    if (rawUrl) {
      const a = document.createElement('a');
      a.href = this.getFullReceiptUrl(rawUrl);
      a.target = '_blank';
      a.download = `Receipt_${record.receipt_id || record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      this.toastService.info('Generating', 'Receipt is generating, please wait...');
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
          this.fetchReceiptRecords(); 
        },
        error: (err) => {
          this.toastService.error('Download Failed', 'Failed to generate receipt on backend.');
        }
      });
    }
  }

  sendingWhatsApp = signal<Set<number>>(new Set());

  onSendWhatsApp(record: OnlinePaymentRecord) {
    if (this.isTL() || this.isTC()) {
      this.toastService.error('Permission Denied', 'Team Leaders are not permitted to send WhatsApp receipts.');
      return;
    }
    this.sendingWhatsApp.update(s => new Set(s).add(record.id));
    this.selectedRecordForReceipt = record;
    
    const finish = () => {
      this.sendingWhatsApp.update(s => {
        const newSet = new Set(s);
        newSet.delete(record.id);
        return newSet;
      });
    };

    setTimeout(async () => {
      try {
        const blob = await this.receiptGenerate.generatePdfBlob();
        const file = new File([blob], `Receipt_${record.receipt_id || record.id}.pdf`, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('generated_receipt', file);

        this.paymentService.updateReceipt(record.id, formData).subscribe({
          next: () => {
            this.paymentService.sendWhatsappReceipt(record.id).subscribe({
              next: (res) => {
                this.toastService.success('WhatsApp Receipt', 'WhatsApp receipt sent successfully!');
                finish();
              },
              error: (err) => {
                this.toastService.error('Send Failed', err.error?.error || 'Failed to send WhatsApp receipt.');
                finish();
              }
            });
          },
          error: () => {
            this.toastService.error('Upload Failed', 'Failed to upload generated receipt to server.');
            finish();
          }
        });
      } catch (err) {
        this.toastService.error('Generation Failed', 'Failed to generate receipt for WhatsApp.');
        finish();
      }
    }, 100);
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

  onDeleteReceiptFile(record: OnlinePaymentRecord): void {
    if (confirm('Are you sure you want to delete the existing receipt file for this record? (The record details will be kept, and you can edit or regenerate the receipt).')) {
      this.paymentService.deleteReceiptFile(record.id).subscribe({
        next: (res: any) => {
          this.toastService.success('Receipt File Deleted', res.message || 'Receipt file deleted successfully.');
          this.fetchReceiptRecords();
        },
        error: (err: any) => {
          console.error('Error deleting receipt file:', err);
          this.toastService.error('Delete Failed', err.error?.message || 'Failed to delete the receipt file.');
        }
      });
    }
  }

  onDelete(record: OnlinePaymentRecord): void {
    this.onDeleteReceiptFile(record);
  }

  onModalClose() {
    this.showEditModal.set(false);
    this.editRecord.set(null);
  }

  onModalSubmit() {
    this.showEditModal.set(false);
    this.editRecord.set(null);
    this.toastService.success('Record Updated', 'Receipt details and status updated successfully.');
    this.fetchReceiptRecords();
  }
}
