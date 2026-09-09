import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Manager } from '../../../models/manager.model';
import { UserListService } from '../../../services/user-list.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-edit-manager-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-manager-modal.component.html',
  styleUrl: './edit-manager-modal.component.css'
})
export class EditManagerModalComponent implements OnInit {
  @Input() manager!: Manager;
  @Input() branches: any[] = [];
  @Input() roles: any[] = [];
  
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private userListService = inject(UserListService);
  private toastService = inject(ToastService);

  isSubmitting = signal(false);
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

    if (!this.formFullName.trim()) {
      this.toastService.error('Validation Error', 'Full Name is required.');
      return;
    }
    if (!this.formMobile.trim()) {
      this.toastService.error('Validation Error', 'Mobile Number is required.');
      return;
    }

    const branchObj = this.branches.find(b => 
      b.name?.toLowerCase() === this.formBranch?.toLowerCase() ||
      b.code?.toLowerCase() === this.formBranch?.toLowerCase()
    );
    const branchId = branchObj ? branchObj.id : null;

    const roleObj = this.roles.find(r =>
      r.name?.toLowerCase() === this.formRole?.toLowerCase() ||
      r.code?.toLowerCase() === this.formRole?.toLowerCase()
    );

    const payload: any = {
      full_name: this.formFullName.trim(),
      phone: this.formMobile.trim(),
      gender: this.formGender,
      status: this.formStatus
    };

    if (branchId !== null) payload.branch_id = branchId;
    if (roleObj) payload.role_ids = [roleObj.id];
    if (this.formEmail.trim()) payload.email = this.formEmail.trim();
    if (this.formOfficialNumber.trim()) payload.office_phone = this.formOfficialNumber.trim();
    if (this.formSlab.trim()) payload.slab = this.formSlab.trim();
    if (this.formSalary.trim()) payload.salary = this.formSalary.trim();
    if (this.formDateOfJoining.trim()) payload.date_of_joining = this.formDateOfJoining.trim();
    if (this.formDateOfRelieving.trim()) payload.date_of_relieving = this.formDateOfRelieving.trim();
    if (this.formBankAccountNumber.trim()) payload.bank_account_number = this.formBankAccountNumber.trim();
    if (this.formBankIfscCode.trim()) payload.bank_ifsc_code = this.formBankIfscCode.trim();
    if (this.formBankHolderName.trim()) payload.bank_holder_name = this.formBankHolderName.trim();
    if (this.formAddress.trim()) payload.address = this.formAddress.trim();

    const targetId = this.originalManagerSnapshot.id || this.originalManagerSnapshot.employeeId || '';
    if (!targetId) {
      this.toastService.error('Error', 'Invalid manager record ID.');
      return;
    }
    this.isSubmitting.set(true);

    this.userListService.updateUser(targetId, payload).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.toastService.success('Manager Updated', 'Manager details updated successfully.');
        this.updated.emit();
        this.close.emit();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error updating manager:', err);
        let errorMsg = 'Failed to update manager details.';
        if (err?.error?.message) {
          errorMsg = err.error.message;
        } else if (err?.error?.errors) {
          const errs = err.error.errors;
          if (typeof errs === 'string') errorMsg = errs;
          else if (typeof errs === 'object') {
            const firstKey = Object.keys(errs)[0];
            const val = errs[firstKey];
            errorMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
          }
        }
        this.toastService.error('API Error', errorMsg);
      }
    });
  }
}
