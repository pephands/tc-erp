import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../../services/user-list.service';
import { Telecaller } from '../../../models/telecaller.model';

@Component({
  selector: 'app-add-telecaller-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-telecaller-modal.component.html',
  styleUrl: './add-telecaller-modal.component.css'
})
export class AddTelecallerModalComponent implements OnInit, OnChanges {
  private userListService = inject(UserListService);

  @Input() branches: any[] = [];
  @Input() telecallerToEdit: Telecaller | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  isEditMode = false;

  // Form Fields
  formFullName = '';
  formMobile = '';
  formGender: 'Male' | 'Female' | 'Other' = 'Male';
  formBranch = '';
  formRole = 'Tele Caller';

  // Optional Fields
  formOriginalName = '';
  formOfficialNumber = '';
  formSlab = '';
  formSalary = '';
  formDateOfJoining = '';
  formDateOfRelieving = '';
  formBankAccountNumber = '';
  formBankIfscCode = '';
  formBankHolderName = '';
  formAddress = '';
  selectedAadharFile: File | null = null;
  existingAadharUrl: string | null = null;
  isAadharReplaced = false;

  ngOnInit() {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['telecallerToEdit']) {
      this.initForm();
    }
  }

  initForm(): void {
    if (this.telecallerToEdit) {
      this.isEditMode = true;
      const t = this.telecallerToEdit;
      this.formFullName = t.fullName || '';
      this.formOriginalName = t.originalName || '';
      this.formMobile = t.personalNo || '';
      this.formOfficialNumber = t.officialNo || '';
      this.formGender = t.gender === 'Female' ? 'Female' : 'Male';
      this.formRole = t.role || 'Tele Caller';
      this.formSlab = t.slab || '';
      this.formBranch = t.branch || (this.branches.length ? this.branches[0].name : '');
      this.formSalary = t.salary || '0';
      this.formDateOfJoining = t.dateOfJoining || '';
      this.formDateOfRelieving = t.dateOfRelieving || '';
      this.formBankAccountNumber = t.bankAccountNumber || '';
      this.formBankIfscCode = t.bankIfscCode || '';
      this.formBankHolderName = t.bankHolderName || '';
      this.formAddress = t.address || '';
      this.selectedAadharFile = null;
      this.existingAadharUrl = t.aadharImage || null;
      this.isAadharReplaced = false;
    } else {
      this.isEditMode = false;
      this.resetAddForm();
    }
  }

  resetAddForm(): void {
    this.formFullName = '';
    this.formOriginalName = '';
    this.formMobile = '';
    this.formOfficialNumber = '';
    this.formGender = 'Male';
    this.formRole = 'Tele Caller';
    this.formSlab = '';
    this.formBranch = this.branches.length ? (this.branches[0].name || '') : '';
    this.formSalary = '';
    this.formDateOfJoining = '';
    this.formDateOfRelieving = '';
    this.formBankAccountNumber = '';
    this.formBankIfscCode = '';
    this.formBankHolderName = '';
    this.formAddress = '';
    this.selectedAadharFile = null;
    this.existingAadharUrl = null;
    this.isAadharReplaced = false;
  }

  onAadharFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedAadharFile = input.files[0];
    }
  }

  removeExistingAadhar(): void {
    this.isAadharReplaced = true;
    this.selectedAadharFile = null;
  }

  onAddTelecallerSubmit(): void {
    if (!this.formFullName.trim()) {
      alert('Please enter Full Name.');
      return;
    }
    if (!this.formMobile.trim()) {
      alert('Please enter Mobile Number.');
      return;
    }
    if (!this.formBranch) {
      alert('Please select a Branch.');
      return;
    }

    const branchObj = this.branches.find(b => b.name === this.formBranch || b.shortForm === this.formBranch);
    const branchId = branchObj ? branchObj.id : null;

    const payload = new FormData();
    payload.append('employee_Id', this.formMobile.trim());
    payload.append('phone', this.formMobile.trim());
    payload.append('full_name', this.formFullName.trim());
    payload.append('gender', this.formGender);
    if (branchId) payload.append('branch_id', branchId.toString());
    payload.append('status', 'Active');

    if (this.formOfficialNumber.trim()) payload.append('office_phone', this.formOfficialNumber.trim());
    if (this.formSlab.trim()) payload.append('slab', this.formSlab.trim());
    if (this.formSalary.trim()) payload.append('salary', this.formSalary.trim());
    if (this.formDateOfJoining.trim()) payload.append('date_of_joining', this.formDateOfJoining.trim());
    if (this.formDateOfRelieving.trim()) payload.append('date_of_relieving', this.formDateOfRelieving.trim());
    if (this.formBankAccountNumber.trim()) payload.append('bank_account_number', this.formBankAccountNumber.trim());
    if (this.formBankIfscCode.trim()) payload.append('bank_ifsc_code', this.formBankIfscCode.trim());
    if (this.formBankHolderName.trim()) payload.append('bank_holder_name', this.formBankHolderName.trim());
    if (this.formAddress.trim()) payload.append('address', this.formAddress.trim());

    if (this.selectedAadharFile) {
      payload.append('aadhar_image', this.selectedAadharFile);
    }

    if (!this.isEditMode) {
      payload.append('password', 'Welcome@123');
      payload.append('role_code', 'TC');
      payload.append('is_active', 'true');
    }

    if (this.isEditMode && this.telecallerToEdit) {
      const targetId = this.telecallerToEdit.rawId || this.telecallerToEdit.id;
      this.userListService.updateUser(targetId, payload).subscribe({
        next: (res) => {
          alert('TeleCaller updated successfully!');
          this.updated.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Error updating telecaller:', err);
          alert('Failed to update TeleCaller details.');
        }
      });
    } else {

      this.userListService.addUser(payload).subscribe({
        next: (res) => {
          alert('TeleCaller added successfully!');
          this.added.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Error adding telecaller:', err);
          alert('Failed to add TeleCaller. Ensure the mobile number is unique.');
        }
      });
    }
  }
}
