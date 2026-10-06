import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Endpoint } from '../../http/endpoint';
import { AuthService } from '../../services/auth.service';
import { BranchListService } from '../../services/branch-list.service';

interface LiveBatchStat {
  branch_id: number;
  branch_name: string;
  unique_donors: number;
  total_amount: number;
  record_count: number;
  old_donor_count: number;
  old_donor_amount: number;
  new_donor_count: number;
  new_donor_amount: number;
}

interface OverallBatchStat {
  branch_id: number;
  branch_name: string;
  unique_donors: number;
  total_amount: number;
  record_count: number;
  old_donor_count: number;
  old_donor_amount: number;
  new_donor_count: number;
  new_donor_amount: number;
}

@Component({
  selector: 'app-live-batch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-batch.component.html',
  styleUrl: './live-batch.component.css'
})
export class LiveBatchComponent implements OnInit {
  private http = inject(HttpClient);
  private endpoint = inject(Endpoint);
  private authService = inject(AuthService);
  private branchListService = inject(BranchListService);

  activeTab = signal<number>(1);

  // Tab 1 state
  stats = signal<LiveBatchStat[]>([]);
  isLoading1 = signal<boolean>(false);
  
  // Tab 2 state
  overallStats = signal<OverallBatchStat[]>([]);
  overallAmount = signal<number>(0);
  overallRecords = signal<number>(0);
  overallDonors = signal<number>(0);
  overallOldAmount = signal<number>(0);
  overallNewAmount = signal<number>(0);
  overallOldCount = signal<number>(0);
  overallNewCount = signal<number>(0);
  isLoading2 = signal<boolean>(false);
  
  // Tab 2 filters
  startDate = signal<string>('');
  endDate = signal<string>('');
  selectedBranchId = signal<string>('');
  branches = signal<any[]>([]);

  ngOnInit() {
    this.fetchBranches();
    
    // Set default date to today for Tab 2
    const today = new Date().toISOString().split('T')[0];
    this.startDate.set(today);
    this.endDate.set(today);
    
    this.loadData();
  }

  fetchBranches() {
    this.branchListService.getData(1, 1000, undefined, 'true', 'false').subscribe({
      next: (res) => {
        if (res && res.data) {
          this.branches.set(res.data);
        } else if (res && res.results) {
          this.branches.set(res.results);
        }
      }
    });
  }

  setTab(tab: number) {
    this.activeTab.set(tab);
    if (tab === 2 && this.overallStats().length === 0) {
      this.loadOverallData();
    }
  }

  loadData() {
    this.isLoading1.set(true);
    let params: any = {};

    const token = this.authService.currentSession()?.token;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Token ${token}`);
    }

    this.http.get<any>(`${this.endpoint.baseUrl}payments/batch/live/`, { headers, params }).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.stats.set(res.data);
        }
        this.isLoading1.set(false);
      },
      error: () => {
        this.isLoading1.set(false);
      }
    });
  }

  loadOverallData() {
    this.isLoading2.set(true);
    let params: any = {};
    if (this.startDate()) params.start_date = this.startDate();
    if (this.endDate()) params.end_date = this.endDate();
    if (this.selectedBranchId()) params.branch = this.selectedBranchId();

    const token = this.authService.currentSession()?.token;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Token ${token}`);
    }

    this.http.get<any>(`${this.endpoint.baseUrl}payments/batch/overall/`, { headers, params }).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.overallStats.set(res.data);
          this.overallAmount.set(res.overall_amount);
          this.overallRecords.set(res.overall_records);
          this.overallDonors.set(res.overall_donors);
          this.overallOldAmount.set(res.overall_old_amount);
          this.overallNewAmount.set(res.overall_new_amount);
          this.overallOldCount.set(res.overall_old_count);
          this.overallNewCount.set(res.overall_new_count);
        }
        this.isLoading2.set(false);
      },
      error: () => {
        this.isLoading2.set(false);
      }
    });
  }
  
  onFilterChange() {
    this.loadOverallData();
  }
}
