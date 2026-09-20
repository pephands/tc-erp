import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-verified-donors',
  styleUrl: './verified-donors.css',
  templateUrl: './verified-donors.html',
})
export class VerifiedDonors implements OnInit {
  paymentService = inject(PaymentService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);

  records = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  isDeleting = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalRecords = signal<number>(0);

  // Search
  searchQuery = signal<string>('');
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.fetchRecords();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((query) => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.fetchRecords();
    });
  }

  onSearch(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.searchSubject.next(input);
  }

  fetchRecords(): void {
    this.isLoading.set(true);
    this.paymentService.getVerifiedDonors(this.currentPage(), this.searchQuery()).subscribe({
      next: (res) => {
        if (res.results) {
          this.records.set(res.results);
          this.totalRecords.set(res.count);
          // Assuming page_size is 100 as set in backend
          this.totalPages.set(Math.ceil(res.count / 100));
        } else {
          // If no pagination returned for some reason
          this.records.set(res);
          this.totalRecords.set(res.length);
          this.totalPages.set(1);
        }
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.toastService.error('Error', 'Failed to load verified donors.');
        console.error(err);
      }
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.fetchRecords();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.fetchRecords();
    }
  }

  downloadSampleFormat(): void {
    const data = [
      { 'MOBILENO': '9444524537', 'DONOR NAME': 'T.AJIT KRISHNAN', 'PAN NUMBER': 'AAAPA4091K' },
      { 'MOBILENO': '9876543210', 'DONOR NAME': 'JOHN DOE', 'PAN NUMBER': '' }
    ];
    
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donors_Sample');
    XLSX.writeFile(wb, 'verified_donors_sample.xlsx');
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        this.toastService.warning('Invalid File', 'Please select a valid Excel (.xlsx, .xls) file.');
        input.value = '';
        return;
      }

      this.isUploading.set(true);
      this.paymentService.uploadVerifiedDonors(file).subscribe({
        next: (res) => {
          this.isUploading.set(false);
          this.toastService.success('Upload Started', res.message || 'Upload process started in background.');
          input.value = '';
          // Optionally refresh after a few seconds, but background task might take time
          setTimeout(() => this.fetchRecords(), 5000);
        },
        error: (err: HttpErrorResponse) => {
          this.isUploading.set(false);
          this.toastService.error('Upload Failed', err.error?.error || 'Failed to start upload process.');
          input.value = '';
        }
      });
    }
  }

  forceDeleteAll(): void {
    if (confirm('Are you absolutely sure you want to delete ALL Verified Donor records? This action cannot be undone!')) {
      this.isDeleting.set(true);
      this.paymentService.forceDeleteVerifiedDonors().subscribe({
        next: (res) => {
          this.isDeleting.set(false);
          this.toastService.info('Delete Started', res.message || 'Delete process started in background.');
          // Refresh after a delay since it runs in background
          setTimeout(() => this.fetchRecords(), 3000);
        },
        error: (err: HttpErrorResponse) => {
          this.isDeleting.set(false);
          this.toastService.error('Error', 'Failed to start delete process.');
        }
      });
    }
  }
}
