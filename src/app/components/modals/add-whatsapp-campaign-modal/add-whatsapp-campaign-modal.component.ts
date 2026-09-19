import { Component, EventEmitter, Input, Output, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappCampaignCreateService } from '../../../services/whatsapp-campaign-create.service';
import { WhatsappAccountService } from '../../../services/whatsapp-campaign.service';
import { ToastService } from '../../../services/toast.service';
import { BranchListService } from '../../../services/branch-list.service';

@Component({
  selector: 'app-add-whatsapp-campaign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-whatsapp-campaign-modal.component.html',
  styleUrl: './add-whatsapp-campaign-modal.component.css'
})
export class AddWhatsappCampaignModalComponent implements OnInit, OnChanges {
  @Output() closeModal = new EventEmitter<void>();
  @Output() campaignAdded = new EventEmitter<void>();
  @Input() campaignToEdit?: any;

  private campaignCreateService = inject(WhatsappCampaignCreateService);
  private accountService = inject(WhatsappAccountService);
  private branchService = inject(BranchListService);
  private toastService = inject(ToastService);

  formBranch = '';
  formAccount = '';
  formCampaignName = '';
  formIsActive = true;
  isManager = true; // Added to fix template error

  isSubmitting = signal<boolean>(false);
  branches = signal<any[]>([]);
  allAccounts = signal<any[]>([]);
  availableAccounts = signal<any[]>([]);

  ngOnInit() {
    this.branchService.getData().subscribe({
      next: (res: any) => {
        this.branches.set(res.data || res);
      }
    });

    this.accountService.getAccounts().subscribe({
      next: (res: any) => {
        this.allAccounts.set(res.data || res);
        if (this.campaignToEdit && this.campaignToEdit.branch) {
          this.onBranchChange();
          if (this.campaignToEdit.whatsapp_account) {
            this.formAccount = this.campaignToEdit.whatsapp_account.toString();
          }
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['campaignToEdit'] && this.campaignToEdit) {
      const c = this.campaignToEdit;
      this.formBranch = c.branch ? c.branch.toString() : '';
      this.formAccount = c.whatsapp_account ? c.whatsapp_account.toString() : '';
      this.formCampaignName = c.campaign_name || '';
      this.formIsActive = c.is_active !== undefined ? !!c.is_active : true;
        
      if (this.formBranch && this.allAccounts().length > 0) {
        this.onBranchChange();
        if (c.whatsapp_account) {
          this.formAccount = c.whatsapp_account.toString();
        }
      }
    }
  }

  onBranchChange() {
    this.formAccount = '';
    if (this.formBranch) {
      const filtered = this.allAccounts().filter(a => a.branch.toString() === this.formBranch.toString());
      this.availableAccounts.set(filtered);
      if (filtered.length > 0) {
        this.formAccount = filtered[0].id.toString();
      }
    } else {
      this.availableAccounts.set([]);
    }
  }

  getMappedAccountName(): string {
    const acc = this.availableAccounts().find(a => a.id.toString() === this.formAccount);
    return acc ? `${acc.whatsapp_number} (${acc.platform_name})` : '';
  }

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    this.isSubmitting.set(true);
    
    const formData = new FormData();
    formData.append('branch', this.formBranch);
    if (this.formAccount) {
      formData.append('whatsapp_account', this.formAccount);
    }
    formData.append('campaign_name', this.formCampaignName);
    formData.append('is_active', this.formIsActive ? 'true' : 'false');

    if (this.campaignToEdit && this.campaignToEdit.id) {
      this.campaignCreateService.putData(this.campaignToEdit.id, formData).subscribe({
        next: (res) => {
          this.toastService.success('Success', 'Campaign updated successfully');
          this.isSubmitting.set(false);
          this.campaignAdded.emit();
          this.onClose();
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Failed to update campaign');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.campaignCreateService.postData(formData).subscribe({
        next: (res) => {
          this.toastService.success('Success', 'Campaign created successfully');
          this.isSubmitting.set(false);
          this.campaignAdded.emit();
          this.onClose();
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Failed to create campaign');
          this.isSubmitting.set(false);
        }
      });
    }
  }
}
