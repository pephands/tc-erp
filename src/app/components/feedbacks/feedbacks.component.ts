import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../services/feedback.service';
import { FeedbackRecord } from '../../models/feedback.model';

@Component({
  selector: 'app-feedbacks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedbacks.component.html',
  styleUrl: './feedbacks.component.css',
})
export class FeedbacksComponent implements OnInit {
  private feedbackService = inject(FeedbackService);

  feedbacksList = signal<FeedbackRecord[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Submit Modal State
  isSubmitModalOpen = signal<boolean>(false);
  subjectInput = signal<string>('');
  categoryInput = signal<string>('TL_CONCERN');
  messageInput = signal<string>('');

  // Detail Modal State
  isDetailModalOpen = signal<boolean>(false);
  selectedFeedback = signal<FeedbackRecord | null>(null);

  // Feedback Toast
  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  ngOnInit(): void {
    this.loadFeedbacks();
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 4000);
  }

  loadFeedbacks(): void {
    this.isLoading.set(true);
    this.feedbackService.fetchFeedbacks().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.feedbacksList.set(res.data);
        } else if (res && res.results) {
          this.feedbacksList.set(res.results);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error fetching feedbacks:', err);
        this.isLoading.set(false);
      },
    });
  }

  openSubmitModal(): void {
    this.subjectInput.set('');
    this.categoryInput.set('TL_CONCERN');
    this.messageInput.set('');
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal(): void {
    this.isSubmitModalOpen.set(false);
  }

  onSubmitFeedback(): void {
    if (!this.subjectInput().trim() || !this.messageInput().trim()) {
      this.triggerToast('Please provide both a subject and a description of your concern.');
      return;
    }

    this.isSubmitting.set(true);
    this.feedbackService
      .submitFeedback(this.subjectInput(), this.categoryInput(), this.messageInput())
      .subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          this.closeSubmitModal();
          this.triggerToast('Feedback submitted confidentially to Admin.');
          this.loadFeedbacks();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error submitting feedback:', err);
          this.triggerToast('Failed to submit feedback.');
        },
      });
  }

  openDetailModal(item: FeedbackRecord): void {
    this.selectedFeedback.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedFeedback.set(null);
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
