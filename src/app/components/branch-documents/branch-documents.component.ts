import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchDocumentService } from '../../services/branch-document.service';
import { BranchDocumentRecord } from '../../models/branch-document.model';

@Component({
  selector: 'app-branch-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-documents.component.html',
  styleUrl: './branch-documents.component.css'
})
export class BranchDocumentsComponent {
  private service = inject(BranchDocumentService);

  documents = this.service.getDocuments();

  // Search, Filter & Pagination State
  selectedBranchFilter = signal<string>('');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  branchesList = [
    'All Branches',
    '55-VEHICLE DOCUMENTS',
    '7-TEYNAMPET',
    '6-TAMBARAM',
    '1-PERAMBUR',
    '3-REDHILLS',
    '4-AMBATHUR',
    '5-SALEM'
  ];

  // Filtered records
  filteredDocuments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const branchFilter = this.selectedBranchFilter();
    let list = this.documents();

    if (branchFilter && branchFilter !== 'All Branches') {
      list = list.filter(d => d.branchName === branchFilter);
    }

    if (!query) return list;

    return list.filter(d => 
      d.id.toLowerCase().includes(query) ||
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

  // Modal Dialog Signal
  isUploadModalOpen = signal<boolean>(false);

  // Upload Form Inputs
  uploadFileName = signal<string>('No file chosen');
  selectedFile = signal<File | null>(null);
  inputDocumentName = signal<string>('');
  inputExpiryDate = signal<string>('');
  inputBranchName = signal<string>('');

  onFilterSubmit(): void {
    this.currentPage.set(1);
  }

  onUploadFile(): void {
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
    this.inputBranchName.set('');
  }

  onSubmitDocument(): void {
    const file = this.selectedFile();
    const docName = this.inputDocumentName().trim();
    const expiry = this.inputExpiryDate().trim();
    const branch = this.inputBranchName();

    if (!file) {
      alert('Please select a PDF file to upload.');
      return;
    }
    if (!docName) {
      alert('Please enter a Document Name.');
      return;
    }
    if (!expiry) {
      alert('Please select an Expiry Date.');
      return;
    }
    if (!branch) {
      alert('Please select a Branch Name.');
      return;
    }

    this.service.addDocument(docName, file.name, branch, expiry);
    alert(`Document "${docName}" uploaded successfully for ${branch}!`);
    this.closeUploadModal();
    this.onResetForm();
  }

  onViewDocument(doc: BranchDocumentRecord): void {
    alert(`Viewing document "${doc.documentName}" (${doc.fileName})`);
  }

  onEditDocument(doc: BranchDocumentRecord): void {
    alert(`Editing document details for #${doc.id}`);
  }

  onDeleteDocument(doc: BranchDocumentRecord): void {
    if (confirm(`Are you sure you want to delete document "${doc.documentName}"?`)) {
      this.service.deleteDocument(doc.id);
    }
  }
}
