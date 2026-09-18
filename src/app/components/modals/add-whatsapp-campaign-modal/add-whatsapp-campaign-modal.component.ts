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
export class AddWhatsappCampaignModalComponent implements OnInit {
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
  formMetaTemplateName = '';
  formTemplateType = 'TEXT';
  formIsDynamic = false;
  formIsActive = true;
  formMediaUrl = '';
  
  existingFileUrl = '';
  existingFileName = '';
  
  bodyVars: { label: string }[] = [];
  buttonVars: { label: string }[] = [];

  selectedFile: File | null = null;

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
        // If editing and available, trigger branch change to map account
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
      this.formMetaTemplateName = c.meta_template_name || '';
      this.formTemplateType = c.template_type || 'TEXT';
      this.formIsDynamic = !!c.is_dynamic;
      this.formIsActive = c.is_active !== undefined ? !!c.is_active : true;
      
      this.formMediaUrl = '';
      if (this.formTemplateType === 'IMAGE' && c.image_url) this.formMediaUrl = c.image_url;
      if (this.formTemplateType === 'VIDEO' && c.video_url) this.formMediaUrl = c.video_url;
      if (this.formTemplateType === 'DOCUMENT' && c.document_url) this.formMediaUrl = c.document_url;
      
      this.existingFileUrl = '';
      this.existingFileName = '';
      if (this.formTemplateType === 'IMAGE' && c.image_upload) {
        this.existingFileUrl = c.image_upload;
        this.existingFileName = c.image_upload.split('/').pop() || 'Existing Image';
      }
      if (this.formTemplateType === 'VIDEO' && c.video_upload) {
        this.existingFileUrl = c.video_upload;
        this.existingFileName = c.video_upload.split('/').pop() || 'Existing Video';
      }
      if (this.formTemplateType === 'DOCUMENT' && c.document_upload) {
        this.existingFileUrl = c.document_upload;
        this.existingFileName = c.document_upload.split('/').pop() || 'Existing Document';
      }
      
      this.bodyVars = Array.isArray(c.body_variables_config) 
        ? c.body_variables_config.map((lbl: string) => ({ label: lbl }))
        : [];
        
      this.buttonVars = Array.isArray(c.button_variables_config)
        ? c.button_variables_config.map((lbl: string) => ({ label: lbl }))
        : [];
        
      if (this.formBranch && this.allAccounts().length > 0) {
        this.onBranchChange();
        if (c.whatsapp_account) {
          this.formAccount = c.whatsapp_account.toString();
        }
      }
    }
  }

  addBodyVar() {
    this.bodyVars.push({ label: '' });
  }

  removeBodyVar(index: number) {
    this.bodyVars.splice(index, 1);
  }

  addButtonVar() {
    this.buttonVars.push({ label: '' });
  }

  removeButtonVar(index: number) {
    this.buttonVars.splice(index, 1);
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

  getAcceptType(): string {
    switch(this.formTemplateType) {
      case 'IMAGE': return 'image/*';
      case 'VIDEO': return 'video/*';
      case 'DOCUMENT': return '.pdf,.doc,.docx,.xls,.xlsx';
      default: return '*/*';
    }
  }

  removeExistingFile() {
    this.existingFileUrl = '';
    this.existingFileName = '';
  }

  copyExistingUrl(event: Event) {
    event.preventDefault();
    if (this.existingFileUrl) {
      navigator.clipboard.writeText(this.existingFileUrl).then(() => {
        this.toastService.success('Copied', 'Media URL copied to clipboard');
      }).catch(err => {
        this.toastService.error('Error', 'Failed to copy URL');
      });
    }
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      this.formMediaUrl = ''; // Clear URL if file selected
      this.removeExistingFile(); // Clear existing file visualization
    } else {
      this.selectedFile = null;
    }
  }

  onClose() {
    this.closeModal.emit();
  }

  onSubmit() {
    this.isSubmitting.set(true);
    
    const bodyVarsArr = this.bodyVars.map(v => v.label.trim()).filter(l => l);
    const buttonVarsArr = this.buttonVars.map(v => v.label.trim()).filter(l => l);

    // Use FormData because we might be uploading a file
    const formData = new FormData();
    formData.append('branch', this.formBranch);
    if (this.formAccount) {
      formData.append('whatsapp_account', this.formAccount);
    }
    formData.append('campaign_name', this.formCampaignName);
    formData.append('meta_template_name', this.formMetaTemplateName);
    formData.append('template_type', this.formTemplateType);
    formData.append('is_dynamic', this.formIsDynamic ? 'true' : 'false');
    formData.append('is_active', this.formIsActive ? 'true' : 'false');
    
    if (this.formIsDynamic) {
      formData.append('body_variables_config', JSON.stringify(bodyVarsArr));
      formData.append('button_variables_config', JSON.stringify(buttonVarsArr));
    }

    if (this.formTemplateType !== 'TEXT') {
      if (this.selectedFile) {
        if (this.formTemplateType === 'IMAGE') { formData.append('image_upload', this.selectedFile); formData.append('image_url', ''); }
        if (this.formTemplateType === 'VIDEO') { formData.append('video_upload', this.selectedFile); formData.append('video_url', ''); }
        if (this.formTemplateType === 'DOCUMENT') { formData.append('document_upload', this.selectedFile); formData.append('document_url', ''); }
      } else if (this.formMediaUrl) {
        if (this.formTemplateType === 'IMAGE') { formData.append('image_url', this.formMediaUrl); formData.append('image_upload', ''); }
        if (this.formTemplateType === 'VIDEO') { formData.append('video_url', this.formMediaUrl); formData.append('video_upload', ''); }
        if (this.formTemplateType === 'DOCUMENT') { formData.append('document_url', this.formMediaUrl); formData.append('document_upload', ''); }
      } else {
        // Clear all if neither file nor url is provided
        formData.append('image_upload', ''); formData.append('image_url', '');
        formData.append('video_upload', ''); formData.append('video_url', '');
        formData.append('document_upload', ''); formData.append('document_url', '');
      }
    } else {
      // If changed to TEXT, clear all
      formData.append('image_upload', ''); formData.append('image_url', '');
      formData.append('video_upload', ''); formData.append('video_url', '');
      formData.append('document_upload', ''); formData.append('document_url', '');
    }

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
