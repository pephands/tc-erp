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

  activeTab = signal<'BATCHES' | 'MODES'>('BATCHES');

  batches = signal<any[]>([]);
  paymentModes = signal<any[]>([]);
  
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
    this.fetchPaymentModes();
  }

  setTab(tab: 'BATCHES' | 'MODES'): void {
    this.activeTab.set(tab);
  }

  fetchPaymentModes(): void {
    this.paymentService.getPaymentModes(false).subscribe({
      next: (res) => {
        if (res && res.results) {
          this.paymentModes.set(res.results);
        } else if (Array.isArray(res)) {
          this.paymentModes.set(res);
        } else if (res && res.data) {
          this.paymentModes.set(res.data);
        }
      },
      error: (err) => console.error('Error fetching payment modes:', err)
    });
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

  openEditModal(item: any): void {
    this.isEditing.set(true);
    this.editId.set(item.id);
    if (this.activeTab() === 'BATCHES') {
      this.formData = {
        name: item.name,
        trigger_time: item.trigger_time,
        is_active: item.is_active
      };
    } else {
      this.formData = {
        name: item.name,
        trigger_time: '',
        is_active: item.is_active
      };
    }
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveItem(): void {
    if (this.activeTab() === 'BATCHES') {
      if (!this.formData.name || !this.formData.trigger_time) {
        alert("Name and Trigger Time are required.");
        return;
      }
      if (this.isEditing() && this.editId() !== null) {
        this.paymentService.updateBatchConfig(this.editId()!, this.formData).subscribe({
          next: () => { this.closeModal(); this.fetchBatches(); },
          error: (err) => { console.error("Error updating batch", err); alert("Error updating batch."); }
        });
      } else {
        this.paymentService.createBatchConfig(this.formData).subscribe({
          next: () => { this.closeModal(); this.fetchBatches(); },
          error: (err) => { console.error("Error creating batch", err); alert("Error creating batch."); }
        });
      }
    } else {
      if (!this.formData.name) {
        alert("Name is required.");
        return;
      }
      const data = { name: this.formData.name, is_active: this.formData.is_active };
      if (this.isEditing() && this.editId() !== null) {
        this.paymentService.updatePaymentMode(this.editId()!, data).subscribe({
          next: () => { this.closeModal(); this.fetchPaymentModes(); },
          error: (err) => { console.error("Error updating mode", err); alert("Error updating payment mode."); }
        });
      } else {
        this.paymentService.createPaymentMode(data).subscribe({
          next: () => { this.closeModal(); this.fetchPaymentModes(); },
          error: (err) => { console.error("Error creating mode", err); alert("Error creating payment mode."); }
        });
      }
    }
  }
}
