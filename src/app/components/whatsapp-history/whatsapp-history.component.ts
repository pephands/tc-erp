import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappHistoryService, WhatsappHistoryRecord } from '../../services/whatsapp-history.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-whatsapp-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-history.component.html',
  styleUrls: ['./whatsapp-history.component.css']
})
export class WhatsappHistoryComponent implements OnInit {
  historyRecords: WhatsappHistoryRecord[] = [];
  loading: boolean = false;
  currentPage: number = 1;
  totalItems: number = 0;
  totalPages: number = 1;
  get pageNumbers() {
    const pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxPages - 1);
    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  pageSize: number = 10;
  successCount: number = 0;
  failureCount: number = 0;
  
  filters = {
    status: '',
    campaign_name: '',
    branch: '',
    start_date: '',
    end_date: ''
  };
  
  branches: any[] = [];
  searchSubject = new Subject<string>();
  isTC: boolean = false;
  isAdmin: boolean = false;
  canViewAllBranches: boolean = false;

  constructor(
    private historyService: WhatsappHistoryService,
    private branchService: BranchListService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const roles = this.authService.userRoles();
    this.isAdmin = roles.includes('ADMIN');
    this.canViewAllBranches = roles.includes('ADMIN') || roles.includes('MANAGER');
    if (!roles.includes('ADMIN') && !roles.includes('MANAGER') && roles.includes('TC')) {
      this.isTC = true;
    }
    this.setDefaultDates();

    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      if (!searchTerm || searchTerm.trim().length >= 3) {
        this.onFilterChange();
      }
    });

    this.loadBranches();
    this.loadHistory();
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  loadBranches(): void {
    this.branchService.getData(1, 1000, '', 'true').subscribe({
      next: (res: any) => {
        let branchList = [];
        if (res && res.status === 'success' && res.data) {
           branchList = res.data;
        } else if (res && res.results) {
           branchList = res.results;
        } else if (Array.isArray(res)) {
           branchList = res;
        }
        
        if (!this.canViewAllBranches) {
          const userBranchId = this.authService.currentUser()?.branch?.id;
          if (userBranchId) {
            branchList = branchList.filter((b: any) => b.id === userBranchId);
            this.filters.branch = userBranchId.toString();
          }
        }
        
        this.branches = branchList;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load branches', err)
    });
  }

  loadHistory(page: number = 1): void {
    this.loading = true;
    this.currentPage = page;
    
    this.historyService.getHistory(this.currentPage, this.filters).subscribe({
      next: (res: any) => {
        console.log('History API response:', res);
        
        if (res && res.status === 'success' && res.data) {
           this.historyRecords = res.data;
           this.totalItems = res.count || res.data.length;
           this.successCount = res.success_count || 0;
           this.failureCount = res.failure_count || 0;
        } else if (res && res.results) {
           this.historyRecords = res.results;
           this.totalItems = res.count || res.results.length;
           this.successCount = res.success_count || 0;
           this.failureCount = res.failure_count || 0;
        } else if (Array.isArray(res)) {
           this.historyRecords = res;
           this.totalItems = res.length;
           this.successCount = 0;
           this.failureCount = 0;
        } else {
           this.historyRecords = [];
           this.totalItems = 0;
           this.successCount = 0;
           this.failureCount = 0;
        }
        
        this.totalPages = Math.ceil(this.totalItems / 10) || 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFilterChange(): void {
    this.loadHistory(1);
  }

  setDefaultDates(): void {
    if (this.isTC) {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      this.filters.start_date = todayStr;
      this.filters.end_date = todayStr;
    } else {
      this.filters.start_date = '';
      this.filters.end_date = '';
    }
  }

  resetFilter(): void {
    this.filters = {
      status: '',
      campaign_name: '',
      branch: '',
      start_date: '',
      end_date: ''
    };
    
    if (!this.canViewAllBranches) {
      const userBranchId = this.authService.currentUser()?.branch?.id;
      if (userBranchId) {
        this.filters.branch = userBranchId.toString();
      }
    }
    
    this.setDefaultDates();
    this.loadHistory(1);
  }

  exportHistory(): void {
    this.historyService.exportHistory(this.filters).subscribe({
      next: (response: any) => {
        const blob = new Blob([response.body], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whatsapp_history.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Export failed', err)
    });
  }
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }



  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.loadHistory(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.loadHistory(this.currentPage - 1);
    }
  }
}
