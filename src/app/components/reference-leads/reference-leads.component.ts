import { Component, OnInit, signal, inject , computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { TelecallingService } from '../../services/telecalling.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reference-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reference-leads.component.html',
  styleUrls: ['./reference-leads.component.css']
})
export class ReferenceLeadsComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private telecallingService = inject(TelecallingService);

  role = signal<string>('');
  leads = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  // Form for New Lead (TC only)
  isNewLeadModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);
  
  openUploadModal() {
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal() {
    this.isUploadModalOpen.set(false);
  }

  newLead = signal({
    donor_name: '',
    phone_number: '',
    alternative_number: ''
  });

  dobDay = signal<string>('');
  dobMonth = signal<string>('');
  dobYear = signal<string>('');

  anniDay = signal<string>('');
  anniMonth = signal<string>('');
  anniYear = signal<string>('');

  days = Array.from({length: 31}, (_, i) => (i + 1).toString());
  months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  years = Array.from({length: 100}, (_, i) => (new Date().getFullYear() - i).toString());

  clearDob() {
    this.dobDay.set('');
    this.dobMonth.set('');
    this.dobYear.set('');
  }

  handlePhoneInput(event: any, field: 'phone_number' | 'alternative_number') {
    let val = event.target.value.replace(/[^0-9]/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    event.target.value = val;
    this.newLead.update(l => ({ ...l, [field]: val }));
  }

  clearAnni() {
    this.anniDay.set('');
    this.anniMonth.set('');
    this.anniYear.set('');
  }

  handleDayInput(event: any, updater: any) {
    let val = event.target.value.replace(/[^0-9]/g, '');
    if (val.length > 2) val = val.substring(0, 2);
    let num = parseInt(val, 10);
    if (num > 31) val = '31';
    event.target.value = val;
    updater.set(val);
  }

  handleYearInput(event: any, updater: any) {
    let val = event.target.value.replace(/[^0-9]/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    event.target.value = val;
    updater.set(val);
  }

  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error' | 'info'>('info');
  showToast = signal<boolean>(false);

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

  totalPages = computed(() => {
    return Math.ceil(this.totalRecords() / this.pageSize()) || 1;
  });

  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);
  searchQuery = signal<string>('');
  filterStatus = signal<string>('');
  filterBranch = signal<string>('');
  branches = signal<any[]>([]);

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchLeads();
    }
  }

  ngOnInit() {
    const roles = this.authService.userRoles();
    if (roles.includes('ADMIN')) {
      this.role.set('ADMIN');
      this.fetchBranches();
    } else if (roles.includes('TL')) {
      this.role.set('TL');
    } else if (roles.includes('TC')) {
      this.role.set('TC');
    }
    this.fetchLeads();
  }
  
  fetchBranches() {
    this.http.get(`${environment.baseUrl}branches/?is_active=1&is_trust=false&page_size=1000`, { headers: this.telecallingService.headers }).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.branches.set(res.data);
        } else if (res && res.results) {
          this.branches.set(res.results);
        } else if (Array.isArray(res)) {
          this.branches.set(res);
        }
      }
    });
  }

  showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  fetchLeads() {
    this.isLoading.set(true);
    let params = `?page=${this.currentPage()}&page_size=${this.pageSize()}`;
    if (this.searchQuery()) {
      params += `&search=${this.searchQuery()}`;
    }
    if (this.filterStatus()) {
      params += `&status=${this.filterStatus()}`;
    }
    if (this.filterBranch()) {
      params += `&branch=${this.filterBranch()}`;
    }

    this.http.get(`${environment.baseUrl}telecalling/reference-leads/${params}`, { headers: this.telecallingService.headers }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res && res.results !== undefined) {
          this.leads.set(res.results);
          this.totalRecords.set(res.count);
        } else if (res && res.status === 'success') {
          // Fallback just in case
          this.leads.set(res.data);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openNewLeadModal() {
    this.newLead.set({
      donor_name: '',
      phone_number: '',
      alternative_number: ''
    });
    this.clearDob();
    this.clearAnni();
    this.isNewLeadModalOpen.set(true);
  }

  closeNewLeadModal() {
    this.isNewLeadModalOpen.set(false);
  }

  submitNewLead() {
    if (!this.newLead().phone_number || this.newLead().phone_number.length !== 10) {
      this.showToastNotification("Phone number must be exactly 10 digits.");
      return;
    }
    
    // Construct dates
    let dob = null;
    if (this.dobYear() && this.dobMonth() && this.dobDay()) {
      if (this.dobYear().length !== 4) {
        this.showToastNotification("DOB Year must be 4 digits.");
        return;
      }
      const y = parseInt(this.dobYear(), 10);
      const m = parseInt(this.dobMonth(), 10);
      const d = parseInt(this.dobDay(), 10);
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        this.showToastNotification("Invalid Date of Birth. Please check the day and month.");
        return;
      }
      dob = `${this.dobYear()}-${this.dobMonth()}-${this.dobDay().padStart(2, '0')}`;
    }
    
    let anniversary = null;
    if (this.anniYear() && this.anniMonth() && this.anniDay()) {
      if (this.anniYear().length !== 4) {
        this.showToastNotification("Anniversary Year must be 4 digits.");
        return;
      }
      const y = parseInt(this.anniYear(), 10);
      const m = parseInt(this.anniMonth(), 10);
      const d = parseInt(this.anniDay(), 10);
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        this.showToastNotification("Invalid Anniversary Date. Please check the day and month.");
        return;
      }
      anniversary = `${this.anniYear()}-${this.anniMonth()}-${this.anniDay().padStart(2, '0')}`;
    }

    const payload: any = { ...this.newLead(), dob, anniversary };
    if (payload.donor_name) {
      payload.donor_name = payload.donor_name.toUpperCase();
    }

    this.http.post(`${environment.baseUrl}telecalling/reference-leads/`, payload, { headers: this.telecallingService.headers }).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.showToastNotification("Reference lead submitted successfully!", "success");
          this.closeNewLeadModal();
          this.fetchLeads();
        }
      },
      error: (err) => {
        this.showToastNotification(err.error?.message || "Failed to submit lead", "error");
      }
    });
  }

  exportExcel() {
    let params = `?`;
    if (this.searchQuery()) params += `&search=${this.searchQuery()}`;
    if (this.filterStatus()) params += `&status=${this.filterStatus()}`;
    
    if (this.role() === 'TL' && this.authService.currentUser()?.branch?.id) {
       params += `&branch=${this.authService.currentUser()?.branch?.id}`;
    } else if (this.filterBranch()) {
       params += `&branch=${this.filterBranch()}`;
    }

    this.http.get(`${environment.baseUrl}telecalling/reference-leads/export/${params}`, {
      headers: this.telecallingService.headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reference_Leads_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showToastNotification("Export successful", "success");
      },
      error: () => {
        this.showToastNotification("Failed to export records", "error");
      }
    });
  }

  downloadSample() {
    this.http.get(`${environment.baseUrl}telecalling/reference-leads/sample/`, {
      headers: this.telecallingService.headers,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reference_Leads_Sample.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showToastNotification("Sample downloaded", "success");
      },
      error: () => {
        this.showToastNotification("Failed to download sample", "error");
      }
    });
  }

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      this.isLoading.set(true);
      let headers = this.telecallingService.headers;
      if (headers) {
        headers = headers.delete('Content-Type'); // Let browser set boundary
      }

      this.http.post(`${environment.baseUrl}telecalling/reference-leads/upload/`, formData, { headers }).subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          if (res && res.status === 'success') {
            this.showToastNotification("File uploaded successfully", "success");
            this.closeUploadModal();
            this.fetchLeads();
          } else {
            this.showToastNotification("Upload failed", "error");
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToastNotification(err.error?.message || "Failed to upload file", "error");
        }
      });
      event.target.value = ''; // Reset input
    }
  }

  updateLeadStatus(leadId: number, status: string) {
    if(!confirm(`Are you sure you want to mark this as ${status}?`)) return;
    this.http.patch(`${environment.baseUrl}telecalling/reference-leads/${leadId}/`, { status }, { headers: this.telecallingService.headers }).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.showToastNotification(`Lead ${status.toLowerCase()} successfully!`, "success");
          this.fetchLeads();
        }
      },
      error: (err) => {
        this.showToastNotification(err.error?.message || "Failed to update lead", "error");
      }
    });
  }
}
