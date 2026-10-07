import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchExpenseService } from '../../services/branch-expense.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { BranchExpenseRecord } from '../../models/branch-expense.model';
import { BranchExpenseCategoryService } from '../../services/branch-expense-category.service';
import { BranchExpenseCategory } from '../../models/branch-expense-category.model';

@Component({
  selector: 'app-expense-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-details.component.html',
  styleUrl: './expense-details.component.css'
})
export class ExpenseDetailsComponent implements OnInit {
  private service = inject(BranchExpenseService);
  private branchListService = inject(BranchListService);
  private authService = inject(AuthService);
  private categoryService = inject(BranchExpenseCategoryService);

  isSuperintendent = computed(() => this.authService.hasRole(['SUPERINTENDENT']));

  expenses = this.service.getExpenses();
  expenseCategories = signal<BranchExpenseCategory[]>([]);

  // Role permissions
  get isAdmin(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('MANAGER');
  }

  get isTl(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('TL') && !this.isAdmin;
  }

  get isPR(): boolean {
    return this.authService.userRoles().includes('PUBLIC_RELATIONS');
  }

  get canCreateExpense(): boolean {
    return this.isAdmin || this.isTl || this.isSuperintendent() || this.isPR;
  }

  get canDeleteExpense(): boolean {
    return this.isAdmin;
  }

  get canDownloadExpense(): boolean {
    return this.isAdmin;
  }

  get userBranchName(): string {
    return this.authService.currentUser()?.branch?.name || '';
  }

  get userBranchId(): number | null {
    return this.authService.currentUser()?.branch?.id || null;
  }

  // Filter selections
  selectedBranchFilter = signal<string>('');
  singleDate = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  searchQuery = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Pagination & Loading
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
  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Master data
  branchesList = signal<any[]>([]);

  // Toast feedback state
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  // Modal State
  isModalOpen = signal<boolean>(false);
  modalMode = signal<'create' | 'edit'>('create');
  editingExpense = signal<BranchExpenseRecord | null>(null);

  // Modal Form Inputs
  inputDate = signal<string>('');
  inputExpenseName = signal<string>('');
  inputAmount = signal<number | null>(null);
  inputRemarks = signal<string>('');
  inputBranchId = signal<string | number>('');
  selectedFile = signal<File | null>(null);
  uploadFileName = signal<string>('No file chosen');
  currentFileUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBranches();
    this.loadCategories();
    if (this.userBranchId || this.userBranchName) {
      this.selectedBranchFilter.set(String(this.userBranchId || this.userBranchName));
    }
    this.fetchExpensesFromApi();
  }

  loadCategories(): void {
    this.categoryService.fetchCategories().subscribe({
      next: (data) => {
        this.expenseCategories.set(data.filter(c => c.is_active));
      },
      error: (err) => console.error('Failed to load expense categories', err)
    });
  }

  loadBranches(): void {
    const isActiveStr = this.isAdmin ? 'true' : undefined;
    this.branchListService.getData(1, 1000, undefined, isActiveStr).subscribe({
      next: (res: any) => {
        let items: any[] = [];
        if (res?.results) {
          items = res.results;
        } else if (res?.data && Array.isArray(res.data)) {
          items = res.data;
        } else if (Array.isArray(res)) {
          items = res;
        }
        
        if (this.isAdmin) {
          items = items.filter((b: any) => b.is_active === true || b.isActive === true || String(b.status).toLowerCase() === 'active');
        } else {
          const userBranchId = this.userBranchId;
          if (userBranchId) {
            items = items.filter((b: any) => b.id === userBranchId);
          }
        }
        
        this.branchesList.set(items);
      },
      error: (err: any) => {
        console.error('Error loading branches:', err);
      }
    });
  }

  fetchExpensesFromApi(): void {
    this.isLoading.set(true);
    const branch = (this.userBranchName || this.userBranchId) ? (this.userBranchName || this.selectedBranchFilter()) : this.selectedBranchFilter();
    const single = this.singleDate();
    const start = this.startDate();
    const end = this.endDate();
    const search = this.searchQuery().trim();

    this.service.fetchExpenses(branch, start, end, single, search).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching expenses:', err);
        this.isLoading.set(false);
      }
    });
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3500);
  }

  // Filtered records
  filteredExpenses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    let list = this.expenses();

    if (!query) return list;

    return list.filter(exp => 
      String(exp.id).toLowerCase().includes(query) ||
      exp.expenseName.toLowerCase().includes(query) ||
      exp.branchName.toLowerCase().includes(query) ||
      exp.remarks.toLowerCase().includes(query) ||
      exp.date.includes(query) ||
      String(exp.amount).includes(query)
    );
  });

  // Paginated records
  paginatedExpenses = computed(() => {
    const list = this.filteredExpenses();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredExpenses().length / this.pageSize()) || 1;
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

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  lastPage(): void {
    this.currentPage.set(this.totalPages());
  }

  // Filter Handlers
  onBranchFilterChange(val: string): void {
    this.selectedBranchFilter.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchExpensesFromApi();
  }

  onSingleDateChange(val: string): void {
    this.singleDate.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchExpensesFromApi();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchExpensesFromApi();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchExpensesFromApi();
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.updateFilterAppliedState();
    this.currentPage.set(1);
    this.fetchExpensesFromApi();
  }

  private updateFilterAppliedState(): void {
    const isBranchFiltered = (this.userBranchId || this.userBranchName) ? false : !!this.selectedBranchFilter();
    this.isFilterApplied.set(!!(isBranchFiltered || this.singleDate() || this.startDate() || this.endDate() || this.searchQuery()));
  }

  onResetFilters(): void {
    this.selectedBranchFilter.set((this.userBranchId || this.userBranchName) ? String(this.userBranchId || this.userBranchName) : '');
    this.singleDate.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.searchQuery.set('');
    this.isFilterApplied.set(false);
    this.currentPage.set(1);
    this.fetchExpensesFromApi();
  }

  onDownloadExpensesExcel(): void {
    if (!this.canDownloadExpense) {
      alert('Only Administrators can download expense report excel files.');
      return;
    }

    this.isExporting.set(true);
    const branch = this.selectedBranchFilter();
    const single = this.singleDate();
    const start = this.startDate();
    const end = this.endDate();
    const search = this.searchQuery().trim();

    this.service.exportExpensesExcel(branch, start, end, single, search).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Expense_Details_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.triggerToast('Expense report downloaded successfully.');
      },
      error: (err: any) => {
        console.error('Error downloading expense report:', err);
        this.isExporting.set(false);
        alert('Failed to download expense report. Please try again.');
      }
    });
  }

  // Modal Handlers
  onOpenCreateModal(): void {
    if (!this.canCreateExpense) {
      alert('You do not have permission to add expenses.');
      return;
    }
    this.modalMode.set('create');
    this.editingExpense.set(null);
    this.onResetForm();

    const todayStr = new Date().toISOString().slice(0, 10);
    this.inputDate.set(todayStr);

    if (this.userBranchId || this.userBranchName) {
      if (this.userBranchId) {
        this.inputBranchId.set(this.userBranchId);
      } else if (this.userBranchName) {
        this.inputBranchId.set(this.userBranchName);
      }
    }

    this.isModalOpen.set(true);
  }

  onOpenEditModal(expense: BranchExpenseRecord): void {
    this.modalMode.set('edit');
    this.editingExpense.set(expense);

    this.inputDate.set(expense.date);
    this.inputExpenseName.set(expense.expenseName);
    this.inputAmount.set(expense.amount);
    this.inputRemarks.set(expense.remarks);
    this.inputBranchId.set(expense.branchId || expense.branchName);
    this.selectedFile.set(null);
    this.uploadFileName.set(expense.fileName ? `Current: ${expense.fileName}` : 'No file chosen');
    this.currentFileUrl.set(expense.fileUrl || null);

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.uploadFileName.set(file.name);
      this.currentFileUrl.set(URL.createObjectURL(file));
    } else {
      this.clearSelectedFile();
    }
  }

  viewCurrentFile(): void {
    const url = this.currentFileUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
    this.currentFileUrl.set(null);
    
    // Reset file input value to allow re-selecting the same file if needed
    const fileInput = document.getElementById('expenseFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onResetForm(): void {
    this.inputDate.set(new Date().toISOString().slice(0, 10));
    this.inputExpenseName.set('');
    this.inputAmount.set(null);
    this.inputRemarks.set('');
    if (this.userBranchId || this.userBranchName) {
      this.inputBranchId.set(this.userBranchId || this.userBranchName || '');
    } else {
      this.inputBranchId.set('');
    }
    this.clearSelectedFile();
  }

  onSubmitExpense(): void {
    const dateVal = this.inputDate().trim();
    const nameVal = this.inputExpenseName().trim();
    const amountVal = this.inputAmount();
    const remarksVal = this.inputRemarks().trim();
    const branchVal = this.inputBranchId();
    const file = this.selectedFile();

    if (!dateVal) {
      alert('Please select an Expense Date.');
      return;
    }
    if (!nameVal) {
      alert('Please enter an Expense Name.');
      return;
    }
    if (amountVal === null || amountVal <= 0) {
      alert('Please enter a valid Amount.');
      return;
    }
    if (!branchVal && !(this.userBranchId || this.userBranchName)) {
      alert('Please select a Branch.');
      return;
    }

    const formData = new FormData();
    formData.append('date', dateVal);
    formData.append('expense_name', nameVal);
    formData.append('amount', String(amountVal));
    formData.append('remarks', remarksVal);
    if (branchVal) {
      formData.append('branch', String(branchVal));
    }
    if (file) {
      formData.append('file', file);
    }
    
    // Explicitly set is_active to true to avoid default false from FormData behavior
    formData.append('is_active', 'true');

    this.isSubmitting.set(true);

    if (this.modalMode() === 'create') {
      this.service.createExpense(formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.triggerToast(`Expense "${nameVal}" created successfully!`);
          this.closeModal();
          this.onResetForm();
          this.fetchExpensesFromApi();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error creating expense:', err);
          const msg = err.error?.message || err.error?.detail || 'Failed to create expense.';
          alert(msg);
        }
      });
    } else {
      const editRecord = this.editingExpense();
      if (!editRecord) return;

      this.service.updateExpense(editRecord.id, formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.triggerToast(`Expense "${nameVal}" updated successfully!`);
          this.closeModal();
          this.onResetForm();
          this.fetchExpensesFromApi();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error updating expense:', err);
          const msg = err.error?.message || err.error?.detail || 'Failed to update expense.';
          alert(msg);
        }
      });
    }
  }

  onViewFile(expense: BranchExpenseRecord): void {
    if (expense.fileUrl) {
      window.open(expense.fileUrl, '_blank');
    } else {
      alert(`No bill or file attachment uploaded for "${expense.expenseName}".`);
    }
  }

  onToggleStatus(expense: BranchExpenseRecord): void {
    const action = expense.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} expense "${expense.expenseName}" (₹${expense.amount})?`)) {
      this.service.deleteExpense(expense.id).subscribe({
        next: (res: any) => {
          this.triggerToast(res.message || `Expense status changed successfully.`);
          this.fetchExpensesFromApi();
        },
        error: (err: any) => {
          console.error(`Error trying to ${action} expense:`, err);
          alert(`Failed to ${action} expense. Please try again.`);
        }
      });
    }
  }
}
