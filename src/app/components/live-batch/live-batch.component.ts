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

  stats = signal<LiveBatchStat[]>([]);
  isLoading = signal<boolean>(false);
  
  // Filters (Removed Branch)


  ngOnInit() {
    this.loadData();
  }


  loadData() {
    this.isLoading.set(true);
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
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

}
