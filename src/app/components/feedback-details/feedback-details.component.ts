import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../services/feedback.service';
import { TelecallingService } from '../../services/telecalling.service';
import { FeedbackRecord } from '../../models/feedback.model';

@Component({
  selector: 'app-feedback-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-details.component.html',
  styleUrl: './feedback-details.component.css',
})
export class FeedbackDetailsComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private telecallingService = inject(TelecallingService);

  feedbacksList = signal<FeedbackRecord[]>([]);
  branchesList = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Filters
  selectedBranchFilter = signal<string>('');
  selectedCategoryFilter = signal<string>('');
  selectedStatusFilter = signal<string>('');
  searchQuery = signal<string>('');

  // Resolve Modal State
  isResolveModalOpen = signal<boolean>(false);
  selectedFeedback = signal<FeedbackRecord | null>(null);
  resolveStatusInput = signal<string>('RESOLVED');
  adminNotesInput = signal<string>('');

  // Toast
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  ngOnInit(): void {
    this.loadBranches();
    this.loadFeedbacks();
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 4000);
  }

  loadBranches(): void {
    this.telecallingService.fetchBranches().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) this.branchesList.set(res);
        else if (res && res.data) this.branchesList.set(res.data);
      },
      error: (err: any) => console.error('Error fetching branches:', err),
    });
  }

  loadFeedbacks(): void {
    this.isLoading.set(true);
    const params: any = {};
    if (this.selectedBranchFilter()) params.branch = this.selectedBranchFilter();
    if (this.selectedCategoryFilter()) params.category = this.selectedCategoryFilter();
    if (this.selectedStatusFilter()) params.status = this.selectedStatusFilter();
    if (this.searchQuery()) params.search = this.searchQuery();

    this.feedbackService.fetchFeedbacks(params).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.feedbacksList.set(res.data);
        } else if (res && res.results) {
          this.feedbacksList.set(res.results);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching admin feedbacks:', err);
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.loadFeedbacks();
  }

  openResolveModal(item: FeedbackRecord): void {
    this.selectedFeedback.set(item);
    this.resolveStatusInput.set(item.status === 'PENDING' ? 'RESOLVED' : item.status);
    this.adminNotesInput.set(item.admin_notes || '');
    this.isResolveModalOpen.set(true);
  }

  closeResolveModal(): void {
    this.isResolveModalOpen.set(false);
    this.selectedFeedback.set(null);
  }

  onSubmitResolution(): void {
    const item = this.selectedFeedback();
    if (!item) return;

    this.isSubmitting.set(true);
    this.feedbackService
      .resolveFeedback(item.id, this.resolveStatusInput(), this.adminNotesInput())
      .subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          this.closeResolveModal();
          this.triggerToast('Feedback resolution notes updated.');
          this.loadFeedbacks();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error updating resolution:', err);
          this.triggerToast('Failed to update resolution.');
        },
      });
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'TL_CONCERN': return 'TL / Supervision Issue';
      case 'BRANCH_ENVIRONMENT': return 'Branch Environment';
      case 'INFRA_WORKSTATION': return 'Infrastructure / Workstation';
      case 'SYSTEM_BUG': return 'ERP / System Issue';
      default: return 'Other Concern';
    }
  }
}
