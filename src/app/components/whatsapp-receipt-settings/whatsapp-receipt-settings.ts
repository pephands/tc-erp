import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { BranchListService } from '../../services/branch-list.service';
import { WhatsappReceiptSettingsService } from '../../services/whatsapp-receipt-settings.service';
import { WhatsappAccountCreateService } from '../../services/whatsapp-account-create.service';

@Component({
  imports: [CommonModule, FormsModule],
  standalone: true,
  selector: 'app-whatsapp-receipt-settings',
  styleUrl: './whatsapp-receipt-settings.css',
  templateUrl: './whatsapp-receipt-settings.html',
})
export class WhatsappReceiptSettings implements OnInit {
  private toastService = inject(ToastService);
  private branchService = inject(BranchListService);
  private receiptSettingsService = inject(WhatsappReceiptSettingsService);
  private whatsappAccountService = inject(WhatsappAccountCreateService);

  settingsList = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  // Modal State
  isModalOpen = signal<boolean>(false);
  isEditMode = false;
  selectedSettingId: number | null = null;
  isSubmitting = signal<boolean>(false);

  // Form State
  formAccount = '';
  formTemplate = '';
  isActive = true;

  // Dropdown Data
  accounts = signal<any[]>([]);

  ngOnInit() {
    this.loadSettings();
    this.loadDropdownData();
  }

  loadSettings() {
    this.isLoading.set(true);
    this.receiptSettingsService.getData().subscribe({
      next: (res) => {
        this.settingsList.set(res.data || res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load settings:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadDropdownData() {
    this.whatsappAccountService.getData().subscribe({
      next: (res: any) => this.accounts.set(res.data || res)
    });
  }

  openModal(setting: any = null) {
    if (setting) {
      this.isEditMode = true;
      this.selectedSettingId = setting.id;
      this.formAccount = setting.whatsapp_account;
      this.formTemplate = setting.receipt_template;
      this.isActive = setting.is_active;
    } else {
      this.isEditMode = false;
      this.selectedSettingId = null;
      this.formAccount = '';
      this.formTemplate = '';
      this.isActive = true;
    }
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSubmit() {
    this.isSubmitting.set(true);
    const payload = {
      whatsapp_account: this.formAccount,
      receipt_template: this.formTemplate,
      is_active: this.isActive
    };

    const request = this.isEditMode 
      ? this.receiptSettingsService.putData(this.selectedSettingId!, payload)
      : this.receiptSettingsService.postData(payload);

    request.subscribe({
      next: () => {
        this.toastService.success('Success', `Setting ${this.isEditMode ? 'updated' : 'added'} successfully`);
        this.isSubmitting.set(false);
        this.closeModal();
        this.loadSettings();
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.error || 'Failed to save setting');
        this.isSubmitting.set(false);
      }
    });
  }
}

