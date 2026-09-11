import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchDocumentService } from '../../services/branch-document.service';
import { BranchListService } from '../../services/branch-list.service';
import { BranchDocumentRecord } from '../../models/branch-document.model';

@Component({
  selector: 'app-branch-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-documents.component.html',
  styleUrl: './branch-documents.component.css'
})
export class BranchDocumentsComponent implements OnInit {
  private service = inject(BranchDocumentService);
  private branchListService = inject(BranchListService);

  documents = this.service.getDocuments();

  // Search, Filter & Pagination State
  selectedBranchFilter = signal<string>('');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Live branches list from API
  branchesList = signal<any[]>([]);

  // Modal Dialog Signals
  isUploadModalOpen = signal<boolean>(false);
  modalMode = signal<'create' | 'edit'>('create');
  editingDocument = signal<BranchDocumentRecord | null>(null);

  // Upload Form Inputs
  uploadFileName = signal<string>('No file chosen');
  selectedFile = signal<File | null>(null);
  inputDocumentName = signal<string>('');
  inputExpiryDate = signal<string>('');
  inputBranchId = signal<string | number>('');

  ngOnInit(): void {
    this.loadBranches();
    this.fetchDocumentsFromApi();
  }

  loadBranches(): void {
    this.branchListService.getData().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.branchesList.set(data);
      },
      error: (err: any) => {
        console.error('Error loading branches:', err);
      }
    });
  }

  fetchDocumentsFromApi(): void {
    this.isLoading.set(true);
    const branchFilter = this.selectedBranchFilter();
    const search = this.searchQuery().trim();

    this.service.fetchDocuments(branchFilter, search).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching branch documents:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Filtered records (Client-side secondary refinement)
  filteredDocuments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const branchFilter = this.selectedBranchFilter();
    let list = this.documents();

    if (branchFilter) {
      list = list.filter(d => 
        String(d.branchId) === String(branchFilter) || 
        d.branchName.toLowerCase().includes(branchFilter.toLowerCase())
      );
    }

    if (!query) return list;

    return list.filter(d => 
      String(d.id).toLowerCase().includes(query) ||
      d.documentName.toLowerCase().includes(query) ||
      d.fileName.toLowerCase().includes(query) ||
      d.branchName.toLowerCase().includes(query) ||
      d.createdDate.toLowerCase().includes(query) ||
      d.expiryDate.toLowerCase().includes(query)
    );
  });

  // Paginated records
  paginatedDocuments = computed(() => {
    const list = this.filteredDocuments();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredDocuments().length / this.pageSize()) || 1;
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

  onFilterSubmit(): void {
    this.currentPage.set(1);
    this.fetchDocumentsFromApi();
  }

  onUploadFile(): void {
    this.modalMode.set('create');
    this.editingDocument.set(null);
    this.onResetForm();
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
      if (!this.inputDocumentName()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        this.inputDocumentName.set(nameWithoutExt);
      }
    } else {
      this.selectedFile.set(null);
      this.uploadFileName.set('No file chosen');
    }
  }

  onResetForm(): void {
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.inputDocumentName.set('');
    this.inputExpiryDate.set('');
    this.inputBranchId.set('');
  }

  onSubmitDocument(): void {
    const file = this.selectedFile();
    const docName = this.inputDocumentName().trim();
    const expiry = this.inputExpiryDate().trim();
    const branch = this.inputBranchId();

    if (this.modalMode() === 'create' && !file) {
      alert('Please select a PDF file to upload.');
      return;
    }
    if (!docName) {
      alert('Please enter a Document Name.');
      return;
    }
    if (!branch) {
      alert('Please select a Branch.');
      return;
    }

    const formData = new FormData();
    formData.append('name', docName);
    formData.append('branch', String(branch));
    if (expiry) {
      formData.append('expiry_date', expiry);
    }
    if (file) {
      formData.append('document', file);
    }

    this.isSubmitting.set(true);

    if (this.modalMode() === 'create') {
      this.service.createDocument(formData).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          alert(`Document "${docName}" uploaded successfully!`);
          this.closeUploadModal();
          this.onResetForm();
          this.fetchDocumentsFromApi();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error creating document:', err);
          const msg = err.error?.message || err.error?.detail || 'Failed to upload document.';
          alert(msg);
        }
      });
    } else {
      const editDoc = this.editingDocument();
      if (!editDoc) return;

      this.service.updateDocument(editDoc.id, formData).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          alert(`Document "${docName}" updated successfully!`);
          this.closeUploadModal();
          this.onResetForm();
          this.fetchDocumentsFromApi();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error updating document:', err);
          const msg = err.error?.message || err.error?.detail || 'Failed to update document.';
          alert(msg);
        }
      });
    }
  }

  onViewDocument(doc: BranchDocumentRecord): void {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      alert(`No document file URL available for "${doc.documentName}".`);
    }
  }

  onEditDocument(doc: BranchDocumentRecord): void {
    this.modalMode.set('edit');
    this.editingDocument.set(doc);
    this.inputDocumentName.set(doc.documentName);
    this.inputBranchId.set(doc.branchId || doc.branchName);
    this.inputExpiryDate.set(this.formatDateForInput(doc.expiryDate));
    this.selectedFile.set(null);
    this.uploadFileName.set(doc.fileName ? `Current: ${doc.fileName}` : 'No file chosen');
    this.isUploadModalOpen.set(true);
  }

  onDeleteDocument(doc: BranchDocumentRecord): void {
    if (confirm(`Are you sure you want to delete document "${doc.documentName}"?`)) {
      this.service.deleteDocument(doc.id).subscribe({
        next: () => {
          alert(`Document "${doc.documentName}" deleted successfully.`);
          this.fetchDocumentsFromApi();
        },
        error: (err: any) => {
          console.error('Error deleting document:', err);
          alert('Failed to delete document. Please try again.');
        }
      });
    }
  }

  private formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthStr = parts[1];
      const year = parts[2];

      const months: { [key: string]: string } = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };

      const month = months[monthStr] || '01';
      if (year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return '';
  }
}
