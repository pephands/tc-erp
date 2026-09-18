import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappAccountCreateService } from '../../../services/whatsapp-account-create.service';
import { ToastService } from '../../../services/toast.service';
import { BranchListService } from '../../../services/branch-list.service';

@Component({
  selector: 'app-add-whatsapp-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-whatsapp-account-modal.component.html',
  styleUrl: './add-whatsapp-account-modal.component.css'
})
export class AddWhatsappAccountModalComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() accountAdded = new EventEmitter<void>();

  @Input() accountData: any = null;

  private accountCreateService = inject(WhatsappAccountCreateService);
  private branchService = inject(BranchListService);
  private toastService = inject(ToastService);

  formBranch = '';
  formPlatform = 'askeva';
  formNumber = '';
  formApiKey = '';
  isActive = true;

  isEditMode = false;
  isSubmitting = signal<boolean>(false);
  branches = signal<any[]>([]);

  ngOnInit() {
    if (this.accountData) {
      this.isEditMode = true;
      this.formBranch = this.accountData.branch || '';
      this.formPlatform = this.accountData.platform_name || 'askeva';
      this.formNumber = this.accountData.whatsapp_number || '';
      this.formApiKey = this.accountData.api_key || '';
      this.isActive = this.accountData.is_active !== undefined ? this.accountData.is_active : true;
    }

    this.branchService.getData().subscribe({
      next: (res: any) => {
        this.branches.set(res.data || res);
      }
    });
  }

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    this.isSubmitting.set(true);
    const payload = {
      branch: this.formBranch,
      platform_name: this.formPlatform,
      whatsapp_number: this.formNumber,
      api_key: this.formApiKey,
      is_active: this.isActive
    };

    const request$ = this.isEditMode
      ? this.accountCreateService.putData(this.accountData.id, payload)
      : this.accountCreateService.postData(payload);

    request$.subscribe({
      next: (res) => {
        const msg = this.isEditMode ? 'WhatsApp Account updated successfully' : 'WhatsApp Account added successfully';
        this.toastService.success('Success', msg);
        this.isSubmitting.set(false);
        this.accountAdded.emit();
        this.onClose();
      },
      error: (err) => {
        const msg = this.isEditMode ? 'Failed to update account' : 'Failed to add account';
        this.toastService.error('Error', err.error?.message || msg);
        this.isSubmitting.set(false);
      }
    });
  }
}
