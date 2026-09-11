import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BranchExpenseService } from '../../services/branch-expense.service';

export interface BranchSummaryItem {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  total_amount: number;
  total_count: number;
}

@Component({
  selector: 'app-expense-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-report.component.html',
  styleUrl: './expense-report.component.css'
})
export class ExpenseReportComponent implements OnInit {
  private service = inject(BranchExpenseService);

  // Filter selections
  singleDate = signal<string>('');
  startDate = signal<string>('');
  endDate = signal<string>('');
  isFilterApplied = signal<boolean>(false);

  // Loading state
  isLoading = signal<boolean>(false);

  // Summary response data
  branchSummaries = signal<BranchSummaryItem[]>([]);
  grandTotalAmount = signal<number>(0);
  totalExpensesCount = signal<number>(0);

  ngOnInit(): void {
    this.fetchSummary();
  }

  fetchSummary(): void {
    this.isLoading.set(true);
    const single = this.singleDate();
    const start = this.startDate();
    const end = this.endDate();

    this.service.fetchExpenseSummary(start, end, single).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          const summaryData = res.data || res;
          const branchesList = summaryData.branches || summaryData.summary || (Array.isArray(summaryData) ? summaryData : []);
          const grandTotal = summaryData.grand_total_amount ?? res.grand_total_amount ?? 0;
          const totalCount = summaryData.grand_total_count ?? summaryData.total_expenses_count ?? res.total_expenses_count ?? 0;

          this.branchSummaries.set(branchesList);
          this.grandTotalAmount.set(grandTotal);
          this.totalExpensesCount.set(totalCount);
        } else {
          this.branchSummaries.set([]);
          this.grandTotalAmount.set(0);
          this.totalExpensesCount.set(0);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching branch expense summary:', err);
        this.branchSummaries.set([]);
        this.grandTotalAmount.set(0);
        this.totalExpensesCount.set(0);
        this.isLoading.set(false);
      }
    });
  }

  // Filter Handlers
  onSingleDateChange(val: string): void {
    this.singleDate.set(val);
    this.updateFilterAppliedState();
    this.fetchSummary();
  }

  onStartDateChange(val: string): void {
    this.startDate.set(val);
    this.updateFilterAppliedState();
    this.fetchSummary();
  }

  onEndDateChange(val: string): void {
    this.endDate.set(val);
    this.updateFilterAppliedState();
    this.fetchSummary();
  }

  private updateFilterAppliedState(): void {
    this.isFilterApplied.set(!!(this.singleDate() || this.startDate() || this.endDate()));
  }

  onResetFilters(): void {
    this.singleDate.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.isFilterApplied.set(false);
    this.fetchSummary();
  }

  calculatePercentage(amount: number): number {
    const total = this.grandTotalAmount();
    if (!total || total === 0) return 0;
    return (amount / total) * 100;
  }
}
