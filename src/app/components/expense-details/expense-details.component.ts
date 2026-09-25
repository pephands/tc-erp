import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchExpenseService } from '../../services/branch-expense.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';
import { BranchExpenseRecord } from '../../models/branch-expense.model';

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

  isSuperintendent = computed(() => this.authService.hasRole(['SUPERINTENDENT']));

  expenses = this.service.getExpenses();

  // Role permissions
  get isAdmin(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('MANAGER');
  }

  get isTl(): boolean {
    const roles = this.authService.userRoles();
    return roles.includes('TL') && !this.isAdmin;
  }

  get canCreateExpense(): boolean {
    return this.isAdmin || this.isTl || this.isSuperintendent();
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

  ngOnInit(): void {
    this.loadBranches();
    if (this.isTl && (this.userBranchId || this.userBranchName)) {
      this.selectedBranchFilter.set(String(this.userBranchId || this.userBranchName));
    }
    this.fetchExpensesFromApi();
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

  fetchExpensesFromApi(): void {
    this.isLoading.set(true);
    const branch = this.isTl ? (this.userBranchName || this.selectedBranchFilter()) : this.selectedBranchFilter();
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
    const isBranchFiltered = this.isTl ? false : !!this.selectedBranchFilter();
    this.isFilterApplied.set(!!(isBranchFiltered || this.singleDate() || this.startDate() || this.endDate() || this.searchQuery()));
  }

  onResetFilters(): void {
    this.selectedBranchFilter.set(this.isTl ? String(this.userBranchId || this.userBranchName) : '');
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

    if (this.isTl) {
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
    } else {
      this.selectedFile.set(null);
      this.uploadFileName.set('No file chosen');
    }
  }

  onResetForm(): void {
    this.inputDate.set(new Date().toISOString().slice(0, 10));
    this.inputExpenseName.set('');
    this.inputAmount.set(null);
    this.inputRemarks.set('');
    if (this.isTl) {
      this.inputBranchId.set(this.userBranchId || this.userBranchName || '');
    } else {
      this.inputBranchId.set('');
    }
    this.selectedFile.set(null);
    this.uploadFileName.set('No file chosen');
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
    if (!branchVal && !this.isTl) {
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
