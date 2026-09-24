import { Component, EventEmitter, Input, Output, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappTemplateService } from '../../../services/whatsapp-template.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-add-whatsapp-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-whatsapp-template-modal.component.html',
  styleUrl: './add-whatsapp-template-modal.component.css'
})
export class AddWhatsappTemplateModalComponent implements OnInit, OnChanges {
  @Output() closeModal = new EventEmitter<void>();
  @Output() templateAdded = new EventEmitter<void>();
  @Input() templateToEdit?: any;
  @Input() campaignId?: number | null;

  private templateService = inject(WhatsappTemplateService);
  private toastService = inject(ToastService);

  formTemplateName = '';
  formMetaTemplateName = '';
  formTemplateType = 'TEXT';
  formIsDynamic = false;
  formIsActive = true;
  formMediaUrl = '';
  formDocumentFilename = '';
  
  existingFileUrl = '';
  existingFileName = '';
  
  bodyVars: { label: string }[] = [];
  buttonVars: { label: string }[] = [];

  selectedFile: File | null = null;
  isSubmitting = signal<boolean>(false);

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['templateToEdit'] && this.templateToEdit) {
      const t = this.templateToEdit;
      this.formTemplateName = t.template_name || '';
      this.formMetaTemplateName = t.meta_template_name || '';
      this.formTemplateType = t.template_type || 'TEXT';
      this.formIsDynamic = !!t.is_dynamic;
      this.formIsActive = t.is_active !== undefined ? !!t.is_active : true;
      this.formDocumentFilename = t.document_filename || '';
      
      this.formMediaUrl = '';
      if (this.formTemplateType === 'IMAGE' && t.image_url) this.formMediaUrl = t.image_url;
      if (this.formTemplateType === 'VIDEO' && t.video_url) this.formMediaUrl = t.video_url;
      if (this.formTemplateType === 'DOCUMENT' && t.document_url) this.formMediaUrl = t.document_url;
      
      this.existingFileUrl = '';
      this.existingFileName = '';
      if (this.formTemplateType === 'IMAGE' && t.image_upload) {
        this.existingFileUrl = t.image_upload;
        this.existingFileName = t.image_upload.split('/').pop() || 'Existing Image';
      }
      if (this.formTemplateType === 'VIDEO' && t.video_upload) {
        this.existingFileUrl = t.video_upload;
        this.existingFileName = t.video_upload.split('/').pop() || 'Existing Video';
      }
      if (this.formTemplateType === 'DOCUMENT' && t.document_upload) {
        this.existingFileUrl = t.document_upload;
        this.existingFileName = t.document_upload.split('/').pop() || 'Existing Document';
      }
      
      this.bodyVars = Array.isArray(t.body_variables_config) 
        ? t.body_variables_config.map((lbl: string) => ({ label: lbl }))
        : [];
        
      this.buttonVars = Array.isArray(t.button_variables_config)
        ? t.button_variables_config.map((lbl: string) => ({ label: lbl }))
        : [];
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

    const formData = new FormData();
    if (this.campaignId) formData.append('campaign', this.campaignId.toString());
    formData.append('template_name', this.formTemplateName);
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
        if (this.formTemplateType === 'DOCUMENT') { 
          formData.append('document_upload', this.selectedFile); 
          formData.append('document_url', '');
          formData.append('document_filename', this.formDocumentFilename); 
        }
      } else if (this.formMediaUrl) {
        if (this.formTemplateType === 'IMAGE') { formData.append('image_url', this.formMediaUrl); formData.append('image_upload', ''); }
        if (this.formTemplateType === 'VIDEO') { formData.append('video_url', this.formMediaUrl); formData.append('video_upload', ''); }
        if (this.formTemplateType === 'DOCUMENT') { 
          formData.append('document_url', this.formMediaUrl); 
          formData.append('document_upload', '');
          formData.append('document_filename', this.formDocumentFilename); 
        }
      } else {
        // Clear all if neither file nor url is provided
        formData.append('image_upload', ''); formData.append('image_url', '');
        formData.append('video_upload', ''); formData.append('video_url', '');
        formData.append('document_upload', ''); formData.append('document_url', '');
        formData.append('document_filename', '');
      }
    } else {
      // If changed to TEXT, clear all
      formData.append('image_upload', ''); formData.append('image_url', '');
      formData.append('video_upload', ''); formData.append('video_url', '');
      formData.append('document_upload', ''); formData.append('document_url', '');
      formData.append('document_filename', '');
    }

    if (this.templateToEdit && this.templateToEdit.id) {
      this.templateService.putData(this.templateToEdit.id, formData).subscribe({
        next: (res) => {
          this.toastService.success('Success', 'Template updated successfully');
          this.isSubmitting.set(false);
          this.templateAdded.emit();
          this.onClose();
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Failed to update template');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.templateService.postData(formData).subscribe({
        next: (res) => {
          this.toastService.success('Success', 'Template created successfully');
          this.isSubmitting.set(false);
          this.templateAdded.emit();
          this.onClose();
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Failed to create template');
          this.isSubmitting.set(false);
        }
      });
    }
  }
}
