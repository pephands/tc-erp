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

  formatTime12Hour(timeString: string): string {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  }

  openEditModal(item: any): void {
    this.isEditing.set(true);
    this.editId.set(item.id);
    if (this.activeTab() === 'BATCHES') {
      let timeVal = item.trigger_time;
      // Strip seconds so HTML <input type="time"> binds correctly
      if (timeVal && timeVal.length >= 5) {
        timeVal = timeVal.substring(0, 5);
      }
      this.formData = {
        name: item.name,
        trigger_time: timeVal,
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

  isErrorModalOpen = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Clock Picker State
  showClockPicker = signal<boolean>(false);
  clockMode = signal<'hour' | 'minute'>('hour');
  tempHour = signal<number>(12);
  tempMinute = signal<number>(0);
  tempAmPm = signal<'AM' | 'PM'>('AM');

  clockHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  clockMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  getClockNumberStyle(value: number, type: 'hour' | 'minute'): any {
    let angle = 0;
    if (type === 'hour') {
      angle = value * 30;
    } else {
      angle = value * 6;
    }
    const radius = 80;
    const rad = (angle - 90) * (Math.PI / 180);
    const x = Math.round(radius * Math.cos(rad));
    const y = Math.round(radius * Math.sin(rad));
    
    return {
      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    };
  }

  getClockHandStyle(): any {
    let angle = 0;
    if (this.clockMode() === 'hour') {
      angle = this.tempHour() * 30;
    } else {
      angle = this.tempMinute() * 6;
    }
    return {
      transform: `rotate(${angle}deg)`
    };
  }

  onClockFaceClick(event: MouseEvent): void {
    const face = event.currentTarget as HTMLElement;
    const rect = face.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    if (this.clockMode() === 'hour') {
      let hour = Math.round(angle / 30);
      if (hour === 0) hour = 12;
      this.tempHour.set(hour);
      setTimeout(() => this.clockMode.set('minute'), 250);
    } else {
      let minute = Math.round(angle / 6);
      if (minute === 60) minute = 0;
      this.tempMinute.set(minute);
    }
  }

  openClockPicker(): void {
    let current = this.formData.trigger_time; // '22:05'
    if (current && current.includes(':')) {
      let [h, m] = current.split(':').map(Number);
      this.tempAmPm.set(h >= 12 ? 'PM' : 'AM');
      h = h % 12;
      this.tempHour.set(h === 0 ? 12 : h);
      this.tempMinute.set(m || 0);
    } else {
      this.tempHour.set(12);
      this.tempMinute.set(0);
      this.tempAmPm.set('AM');
    }
    this.clockMode.set('hour');
    this.showClockPicker.set(true);
  }

  selectClockHour(h: number): void {
    this.tempHour.set(h);
    this.clockMode.set('minute');
  }

  selectClockMinute(m: number): void {
    this.tempMinute.set(m);
    this.applyClockTime();
  }

  applyClockTime(): void {
    let h = this.tempHour();
    if (this.tempAmPm() === 'PM' && h < 12) h += 12;
    if (this.tempAmPm() === 'AM' && h === 12) h = 0;
    
    const hh = h.toString().padStart(2, '0');
    const mm = this.tempMinute().toString().padStart(2, '0');
    this.formData.trigger_time = `${hh}:${mm}`;
    this.showClockPicker.set(false);
  }

  closeClockPicker(): void {
    this.showClockPicker.set(false);
  }

  showError(message: string): void {
    this.closeModal(); // Ensure edit modal is closed so error modal is fully visible
    this.errorMessage.set(message);
    this.isErrorModalOpen.set(true);
  }

  closeErrorModal(): void {
    this.isErrorModalOpen.set(false);
    this.errorMessage.set('');
  }

  saveItem(): void {
    if (this.activeTab() === 'BATCHES') {
      if (!this.formData.trigger_time) {
        this.showError("Trigger Time is required.");
        return;
      }
      // Provide a dummy name if empty, backend handles renaming
      if (!this.formData.name) {
        this.formData.name = 'temp-batch';
      }

      if (this.isEditing() && this.editId() !== null) {
        this.paymentService.updateBatchConfig(this.editId()!, this.formData).subscribe({
          next: () => { this.closeModal(); this.fetchBatches(); },
          error: (err) => { 
            console.error("Error updating batch", err); 
            if (err.error && Array.isArray(err.error)) {
              this.showError(err.error[0]);
            } else if (err.error && err.error.non_field_errors) {
              this.showError(err.error.non_field_errors[0]);
            } else if (err.error && typeof err.error === 'string') {
              this.showError(err.error);
            } else if (err.error && err.error.detail) {
              this.showError(err.error.detail);
            } else {
              this.showError("Error updating batch.");
            }
          }
        });
      } else {
        this.paymentService.createBatchConfig(this.formData).subscribe({
          next: () => { this.closeModal(); this.fetchBatches(); },
          error: (err) => { 
            console.error("Error creating batch", err); 
            if (err.error && Array.isArray(err.error)) {
              this.showError(err.error[0]);
            } else if (err.error && err.error.non_field_errors) {
              this.showError(err.error.non_field_errors[0]);
            } else if (err.error && typeof err.error === 'string') {
              this.showError(err.error);
            } else if (err.error && err.error.detail) {
              this.showError(err.error.detail);
            } else {
              this.showError("Error creating batch.");
            }
          }
        });
      }
    } else {
      if (!this.formData.name) {
        this.showError("Name is required.");
        return;
      }
      const data = { name: this.formData.name, is_active: this.formData.is_active };
      if (this.isEditing() && this.editId() !== null) {
        this.paymentService.updatePaymentMode(this.editId()!, data).subscribe({
          next: () => { this.closeModal(); this.fetchPaymentModes(); },
          error: (err) => { console.error("Error updating mode", err); this.showError("Error updating payment mode."); }
        });
      } else {
        this.paymentService.createPaymentMode(data).subscribe({
          next: () => { this.closeModal(); this.fetchPaymentModes(); },
          error: (err) => { console.error("Error creating mode", err); this.showError("Error creating payment mode."); }
        });
      }
    }
  }
}
