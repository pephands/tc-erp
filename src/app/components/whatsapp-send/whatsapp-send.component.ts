import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappCampaignService } from '../../services/whatsapp-campaign.service';
import { WhatsappTemplateService } from '../../services/whatsapp-template.service';
import { ToastService } from '../../services/toast.service';
import { WhatsappCampaign, WhatsappTemplate } from '../../models/whatsapp-campaign.model';

@Component({
  selector: 'app-whatsapp-send',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-send.component.html',
  styleUrl: './whatsapp-send.component.css'
})
export class WhatsappSendComponent implements OnInit, OnDestroy {
  private campaignService = inject(WhatsappCampaignService);
  private templateService = inject(WhatsappTemplateService);
  private toastService = inject(ToastService);

  // State
  allCampaigns = signal<WhatsappCampaign[]>([]);
  isLoadingCampaigns = signal<boolean>(true);
  
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  
  campaignTemplates = signal<Record<number, WhatsappTemplate[]>>({});
  isLoadingTemplates = signal<Record<number, boolean>>({});
  
  templateNumbers = signal<{ [key: number]: string }>({});
  isSending = signal<{ [key: number]: boolean }>({});
  expandedCampaigns = signal<{ [key: number]: boolean }>({});
  cooldowns = signal<{ [key: number]: number }>({});
  
  // UI state
  isInputFocused: { [key: number]: boolean } = {};
  searchQuery = signal<string>('');
  
  // Timer reference
  private timerRef: any;

  activeCampaigns = computed(() => {
    return this.allCampaigns().filter(c => c.is_active !== false);
  });
  
  paginatedCampaigns = computed(() => {
    const active = this.activeCampaigns();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return active.slice(start, end);
  });

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.activeCampaigns().length / this.pageSize()));
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    this.loadCampaigns();
    this.initCooldownTimer();
  }

  ngOnDestroy(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
    }
  }

  initCooldownTimer(): void {
    this.checkCooldowns();
    this.timerRef = setInterval(() => this.checkCooldowns(), 1000);
  }

  checkCooldowns(): void {
    const storedStr = localStorage.getItem('whatsapp_cooldowns');
    if (!storedStr) return;
    
    try {
      const stored = JSON.parse(storedStr);
      const now = Date.now();
      const updatedCooldowns: { [key: number]: number } = {};
      let hasChanges = false;
      let hasActiveCooldowns = false;
      
      for (const key of Object.keys(stored)) {
        const templateId = parseInt(key, 10);
        const timestamp = stored[templateId];
        const elapsed = now - timestamp;
        
        if (elapsed < 30000) {
          updatedCooldowns[templateId] = Math.ceil((30000 - elapsed) / 1000);
          hasActiveCooldowns = true;
        } else {
          delete stored[templateId];
          hasChanges = true;
        }
      }
      
      this.cooldowns.set(updatedCooldowns);
      
      if (hasChanges) {
        if (hasActiveCooldowns) {
          localStorage.setItem('whatsapp_cooldowns', JSON.stringify(stored));
        } else {
          localStorage.removeItem('whatsapp_cooldowns');
        }
      }
    } catch (e) {
      console.error('Error parsing cooldowns', e);
      localStorage.removeItem('whatsapp_cooldowns');
    }
  }

  setTemplateCooldown(templateId: number): void {
    const storedStr = localStorage.getItem('whatsapp_cooldowns');
    let stored: { [key: number]: number } = {};
    if (storedStr) {
      try {
        stored = JSON.parse(storedStr);
      } catch (e) {}
    }
    
    stored[templateId] = Date.now();
    localStorage.setItem('whatsapp_cooldowns', JSON.stringify(stored));
    this.checkCooldowns();
  }

  loadCampaigns(): void {
    this.isLoadingCampaigns.set(true);
    this.campaignService.getCampaigns().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data || []);
        this.allCampaigns.set(data);
        this.isLoadingCampaigns.set(false);
        // Load templates for all active campaigns
        this.activeCampaigns().forEach(c => {
           if(c.id) this.loadTemplatesForCampaign(c.id);
        });
      },
      error: () => {
        this.toastService.error('Error', 'Failed to load campaigns.');
        this.isLoadingCampaigns.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize.set(Number(target.value));
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  loadTemplatesForCampaign(campaignId: number): void {
    const currentLoading = this.isLoadingTemplates();
    this.isLoadingTemplates.set({ ...currentLoading, [campaignId]: true });
    
    this.templateService.getTemplates(campaignId).subscribe({
      next: (res: any) => {
        let results = res.data?.results || res.results || res.data || [];
        if (!Array.isArray(results)) results = [];
        const activeTemplates = results.filter((t: any) => t.is_active !== false);
        
        const currentTemplates = this.campaignTemplates();
        this.campaignTemplates.set({ ...currentTemplates, [campaignId]: activeTemplates });
        
        const afterLoading = this.isLoadingTemplates();
        this.isLoadingTemplates.set({ ...afterLoading, [campaignId]: false });
      },
      error: () => {
        const afterLoading = this.isLoadingTemplates();
        this.isLoadingTemplates.set({ ...afterLoading, [campaignId]: false });
      }
    });
  }

  onNumberChange(template: WhatsappTemplate, num: string): void {
    // Only allow numbers
    const cleanNum = num.replace(/[^0-9]/g, '').substring(0, 10);
    
    // Update signal map
    this.templateNumbers.update(nums => ({
      ...nums,
      [template.id!]: cleanNum
    }));
  }

  isValidNumber(templateId: number | undefined): boolean {
    if(!templateId) return false;
    const num = this.templateNumbers()[templateId];
    return num ? num.length === 10 : false;
  }

  toggleCampaign(campaignId: number | undefined): void {
    if (!campaignId) return;
    this.expandedCampaigns.update(expanded => ({
      ...expanded,
      [campaignId]: !expanded[campaignId]
    }));
  }

  sendMessage(template: WhatsappTemplate): void {
    if (!template.id || !this.isValidNumber(template.id) || this.cooldowns()[template.id] > 0) return;
    
    let num = this.templateNumbers()[template.id];
    if (num.length === 10) {
      num = '91' + num;
    }
    
    const sendingState = this.isSending();
    this.isSending.set({ ...sendingState, [template.id]: true });

    this.templateService.triggerTest(template.id, num).subscribe({
      next: (res: any) => {
        // Record cooldown successfully triggered
        this.setTemplateCooldown(template.id!);
        this.toastService.success('Success', `Message sent via ${template.template_name}`);
        const currentSending = this.isSending();
        this.isSending.set({ ...currentSending, [template.id!]: false });
        
        const currentNums = this.templateNumbers();
        this.templateNumbers.set({ ...currentNums, [template.id!]: '' });
      },
      error: (err: any) => {
        this.toastService.error('Error', err.error?.message || 'Failed to send message');
        const currentSending = this.isSending();
        this.isSending.set({ ...currentSending, [template.id!]: false });
      }
    });
  }
}
