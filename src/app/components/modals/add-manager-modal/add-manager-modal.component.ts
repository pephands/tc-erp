import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../../services/user-list.service';

@Component({
  selector: 'app-add-manager-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-manager-modal.component.html',
  styleUrl: './add-manager-modal.component.css'
})
export class AddManagerModalComponent {
  private userListService = inject(UserListService);

  @Input() branches: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  formFullName = '';
  formMobile = '';
  formGender: 'Male' | 'Female' | 'Other' = 'Male';
  formBranch = '';

  ngOnInit() {
    this.resetAddForm();
  }

  resetAddForm(): void {
    this.formFullName = '';
    this.formMobile = '';
    this.formGender = 'Male';
    this.formBranch = this.branches.length ? this.branches[0].name : '';
  }

  onAddManagerSubmit(): void {
    if (!this.formFullName.trim() || !this.formMobile.trim() || !this.formBranch) {
      alert('Please fill in all required manager details.');
      return;
    }

    const branchObj = this.branches.find(b => b.name === this.formBranch);
    const branchId = branchObj ? branchObj.id : null;

    const payload = {
      username: this.formMobile.trim(),
      phone: this.formMobile.trim(),
      full_name: this.formFullName.trim(),
      gender: this.formGender,
      branch_id: branchId,
      password: 'Welcome@123',
      role_code: 'TL',
      status: 'Active'
    };

    this.userListService.addUser(payload).subscribe({
      next: (res) => {
        alert('Manager created successfully with default password: Welcome@123');
        this.added.emit();
        this.close.emit();
      },
      error: (err) => {
        console.error('Error creating manager', err);
        alert('Failed to create manager. Ensure the mobile number is unique.');
      }
    });
  }
}
