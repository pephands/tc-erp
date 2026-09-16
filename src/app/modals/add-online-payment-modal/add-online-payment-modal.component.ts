import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-add-online-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-online-payment-modal.component.html',
  styleUrl: './add-online-payment-modal.component.css'
})
export class AddOnlinePaymentModalComponent {
  private paymentService = inject(PaymentService);

  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  // Form Fields
  paymentDate = signal<string>(new Date().toISOString().slice(0, 10));
  mobileNumber = signal<string>('');
  altMobileNumber = signal<string>('');
  donorName = signal<string>('');
  amount = signal<string>('');
  referenceId = signal<string>('');
  modeOfPayment = signal<string>('Gpay');
  slab = signal<string>('1');
  donorType = signal<string>('New');
  panNumber = signal<string>('');
  correctionName = signal<string>('');
  address = signal<string>('');
  dob = signal<string>('');
  remarks = signal<string>('');

  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string>('');

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  onReset(): void {
    this.paymentDate.set(new Date().toISOString().slice(0, 10));
    this.mobileNumber.set('');
    this.altMobileNumber.set('');
    this.donorName.set('');
    this.amount.set('');
    this.referenceId.set('');
    this.modeOfPayment.set('Gpay');
    this.slab.set('1');
    this.donorType.set('New');
    this.panNumber.set('');
    this.correctionName.set('');
    this.address.set('');
    this.dob.set('');
    this.remarks.set('');
    this.selectedFile.set(null);
    this.selectedFileName.set('');
    this.errorMessage.set('');
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    this.errorMessage.set('');

    if (!this.paymentDate()) {
      this.errorMessage.set('Payment Date is required.');
      return;
    }
    if (!this.mobileNumber().trim()) {
      this.errorMessage.set('Mobile Number is required.');
      return;
    }
    if (!this.donorName().trim()) {
      this.errorMessage.set('Donor Name is required.');
      return;
    }
    if (!this.amount() || parseFloat(this.amount()) <= 0) {
      this.errorMessage.set('Please enter a valid amount.');
      return;
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    formData.append('payment_date', this.paymentDate());
    formData.append('mobile_number', this.mobileNumber().trim());
    if (this.altMobileNumber().trim()) {
      formData.append('alt_mobile_number', this.altMobileNumber().trim());
    }
    formData.append('donor_name', this.donorName().trim());
    formData.append('amount', this.amount());
    formData.append('reference_id', this.referenceId().trim());
    formData.append('mode_of_payment', this.modeOfPayment());
    formData.append('slab', this.slab().trim() || '1');
    formData.append('donor_type', this.donorType());

    if (this.panNumber().trim()) {
      formData.append('pan_number', this.panNumber().trim());
    }
    if (this.correctionName().trim()) {
      formData.append('correction_name', this.correctionName().trim());
    }
    if (this.address().trim()) {
      formData.append('address', this.address().trim());
    }
    if (this.dob()) {
      formData.append('dob', this.dob());
    }
    if (this.remarks().trim()) {
      formData.append('remarks', this.remarks().trim());
    }
    if (this.selectedFile()) {
      formData.append('payment_proof', this.selectedFile()!, this.selectedFile()!.name);
    }

    this.paymentService.createOnlinePayment(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.submitted.emit();
      },
      error: (err: any) => {
        console.error('Error submitting online payment:', err);
        this.isSubmitting.set(false);
        const msg = err.error?.message || err.error?.errors?.reference_id?.[0] || 'Failed to submit payment details. Please check all fields.';
        this.errorMessage.set(msg);
      }
    });
  }
}
