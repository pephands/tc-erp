import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApproveAssignService } from '../../services/approve-assign.service';
import { ApproveAssignRecord } from '../../models/approve-assign.model';

@Component({
  selector: 'app-approve-assign',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approve-assign.component.html',
  styleUrl: './approve-assign.component.css'
})
export class ApproveAssignComponent {
  private service = inject(ApproveAssignService);

  records = this.service.getRecords();

  // Search & Pagination State
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Filtered records based on search query
  filteredRecords = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.records();
    if (!query) return list;

    return list.filter(r => 
      r.requestId.toLowerCase().includes(query) ||
      r.branch.toLowerCase().includes(query) ||
      r.requestedBy.toLowerCase().includes(query) ||
      r.base.toLowerCase().includes(query) ||
      r.status.toLowerCase().includes(query)
    );
  });

  // Paginated records
  paginatedRecords = computed(() => {
    const list = this.filteredRecords();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredRecords().length / this.pageSize()) || 1;
  });

  pagesArray = computed(() => {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= Math.min(total, 6); i++) {
      pages.push(i);
    }
    return pages;
  });

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPages());
  }

  onApprove(record: ApproveAssignRecord): void {
    this.service.approveRequest(record.requestId);
  }

  onCancel(record: ApproveAssignRecord): void {
    this.service.cancelRequest(record.requestId);
  }

  onDownload(record: ApproveAssignRecord): void {
    alert(`Downloading base report for Request ID #${record.requestId} (${record.branch})`);
  }

  // Modal Dialog Signals
  isUploadModalOpen = signal<boolean>(false);
  isSubmitModalOpen = signal<boolean>(false);

  // Upload Modal State
  uploadFileName = signal<string>('No file chosen');
  selectedFile = signal<File | null>(null);

  // Submit Task Modal State
  submitBranch = signal<string>('');
  submitCallType = signal<string>('');
  submitTaskCount = signal<number | null>(null);

  // Available Branches list for dropdown
  branchesList = [
    'PERAMBUR',
    'VIRUDHACHALAM',
    'REDHILLS',
    'TAMBARAM',
    'AMBATHUR',
    'SALEM',
    'TEYNAMPET',
    'COIMBATORE',
    'MADURAI',
    'TRICHY',
    'VELLORE',
    'ERODE'
  ];

  // Header Action Handlers
  onUploadBase(): void {
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
  }

  onFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.uploadFileName.set(file.name);
    } else {
      this.selectedFile.set(null);
      this.uploadFileName.set('No file chosen');
    }
  }

  onResetUpload(): void {
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
  }

  onSubmitUpload(): void {
    if (!this.selectedFile()) {
      alert('Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }
    alert(`File "${this.uploadFileName()}" uploaded successfully!`);
    this.closeUploadModal();
    this.onResetUpload();
  }

  onSubmitBase(): void {
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal(): void {
    this.isSubmitModalOpen.set(false);
  }

  onResetSubmitTask(): void {
    this.submitBranch.set('');
    this.submitCallType.set('');
    this.submitTaskCount.set(null);
  }

  onSubmitTaskForm(): void {
    const branch = this.submitBranch();
    const callType = this.submitCallType();
    const count = this.submitTaskCount();

    if (!branch) {
      alert('Please select a Branch Name.');
      return;
    }
    if (!callType) {
      alert('Please select a Call Type.');
      return;
    }
    if (!count || count <= 0) {
      alert('Please enter a valid Task Count.');
      return;
    }

    const baseDisplay = callType.includes('Non Base') ? 'Non Base' : 'Base';
    this.service.addRequest(branch, baseDisplay, count);
    alert(`Task submitted successfully for ${branch} (${baseDisplay} - ${count} tasks)!`);
    this.closeSubmitModal();
    this.onResetSubmitTask();
  }

  onDownloadBase(): void {
    alert('Downloading full base report...');
  }

  onDeleteBase(): void {
    if (confirm('Are you sure you want to delete base records?')) {
      alert('Base records deleted.');
    }
  }
}
