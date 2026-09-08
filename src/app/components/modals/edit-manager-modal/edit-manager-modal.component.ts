import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Manager } from '../../../models/manager.model';

@Component({
  selector: 'app-edit-manager-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-manager-modal.component.html',
  styleUrl: './edit-manager-modal.component.css'
})
export class EditManagerModalComponent {
  @Input() manager!: Manager;
  @Input() branches: any[] = [];
  @Input() roles: any[] = [];
  
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private originalManagerSnapshot: Manager | null = null;
  
  formFullName = '';
  formOriginalName = '';
  formMobile = '';
  formOfficialNumber = '';
  formGender: 'Male' | 'Female' | 'Other' = 'Male';
  formRole = 'Team Lead';
  formSlab = '';
  formBranch = '';
  formSalary = '0';
  formDateOfJoining = '1970-01-01 00:00:00';
  formDateOfRelieving = '1970-01-01 00:00:00';
  formEmail = '';
  formBankAccountNumber = '';
  formBankHolderName = '';
  formBankIfscCode = '';
  formAddress = '';
  formStatus: 'Active' | 'Inactive' = 'Active';

  selectedAadharFile: File | null = null;

  ngOnInit() {
    if (this.manager) {
      this.originalManagerSnapshot = { ...this.manager };
      this.resetEditForm();
    }
  }

  resetEditForm(): void {
    if (this.originalManagerSnapshot) {
      const m = this.originalManagerSnapshot;
      this.formFullName = m.fullName || '';
      this.formOriginalName = m.originalName || '';
      this.formMobile = m.mobile || '';
      this.formOfficialNumber = m.officialNumber || '';
      this.formGender = (m.gender as 'Male'|'Female'|'Other') || 'Male';
      this.formRole = m.role || 'Team Lead';
      this.formSlab = m.slab || '';
      this.formBranch = m.branch || '';
      this.formSalary = m.salary || '0';
      this.formDateOfJoining = m.dateOfJoining || '1970-01-01 00:00:00';
      this.formDateOfRelieving = m.dateOfRelieving || '1970-01-01 00:00:00';
      this.formEmail = m.email || '';
      this.formBankAccountNumber = m.bankAccountNumber || '';
      this.formBankHolderName = m.bankHolderName || '';
      this.formBankIfscCode = m.bankIfscCode || '';
      this.formAddress = m.address || '';
      this.formStatus = (m.status as 'Active'|'Inactive') || 'Active';
    }
  }

  onAadharFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedAadharFile = target.files[0];
    }
  }

  onUpdateManagerSubmit(): void {
    if (!this.originalManagerSnapshot) return;

    alert('Updating managers via API is not fully implemented in this refactor step, but the data is being fetched correctly.');
    
    this.updated.emit();
    this.close.emit();
  }
}
