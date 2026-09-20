import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-batch-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-settings.component.html',
  styleUrls: ['./batch-settings.component.css']
})
export class BatchSettingsComponent implements OnInit {
  private paymentService = inject(PaymentService);

  batches = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isModalOpen = signal<boolean>(false);

  // Form State
  isEditing = signal<boolean>(false);
  editId = signal<number | null>(null);
  
  formData = {
    name: '',
    trigger_time: '',
    is_active: true
  };

  ngOnInit(): void {
    this.fetchBatches();
  }

  fetchBatches(): void {
    this.isLoading.set(true);
    this.paymentService.getBatchConfigs().subscribe({
      next: (res) => {
        if (res && res.results) {
          this.batches.set(res.results);
        } else if (Array.isArray(res)) {
          this.batches.set(res);
        } else if (res && res.data) {
          this.batches.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching batch configs:', err);
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editId.set(null);
    this.formData = {
      name: '',
      trigger_time: '',
      is_active: true
    };
    this.isModalOpen.set(true);
  }

  openEditModal(batch: any): void {
    this.isEditing.set(true);
    this.editId.set(batch.id);
    this.formData = {
      name: batch.name,
      trigger_time: batch.trigger_time,
      is_active: batch.is_active
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveBatch(): void {
    if (!this.formData.name || !this.formData.trigger_time) {
      alert("Name and Trigger Time are required.");
      return;
    }

    if (this.isEditing() && this.editId() !== null) {
      this.paymentService.updateBatchConfig(this.editId()!, this.formData).subscribe({
        next: (res) => {
          this.closeModal();
          this.fetchBatches();
        },
        error: (err) => {
          console.error("Error updating batch", err);
          alert("Error updating batch.");
        }
      });
    } else {
      this.paymentService.createBatchConfig(this.formData).subscribe({
        next: (res) => {
          this.closeModal();
          this.fetchBatches();
        },
        error: (err) => {
          console.error("Error creating batch", err);
          alert("Error creating batch.");
        }
      });
    }
  }
}
