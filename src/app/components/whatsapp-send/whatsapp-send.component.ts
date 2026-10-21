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
  numberCooldowns = signal<{ [key: string]: number }>({});

  // Reactive cooldown map per template based on the phone number currently typed into it
  cooldowns = computed(() => {
    const result: { [key: number]: number } = {};
    const currentNumbers = this.templateNumbers();
    const cooldownsMap = this.numberCooldowns();
    for (const [idStr, phone] of Object.entries(currentNumbers)) {
      const id = Number(idStr);
      if (phone && phone.length === 10 && cooldownsMap[phone]) {
        result[id] = cooldownsMap[phone];
      }
    }
    return result;
  });
  
  // UI state
  isInputFocused: { [key: number]: boolean } = {};
  searchQuery = signal<string>('');
  selectedMediaType = signal<Record<number, string>>({});
  
  // Timer reference
  private timerRef: any;

  activeCampaigns = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const campaigns = this.allCampaigns().filter(c => c.is_active !== false);
    if (!query) return campaigns;
    return campaigns.filter(c => {
      const matchCampaign = c.campaign_name.toLowerCase().includes(query);
      const templates = this.campaignTemplates()[c.id!] || [];
      const matchTemplate = templates.some(t => 
        t.template_name.toLowerCase().includes(query) || 
        (t.template_type && t.template_type.toLowerCase().includes(query))
      );
      return matchCampaign || matchTemplate;
    });
  });

  setMediaTypeFilter(campaignId: number, type: string): void {
    this.selectedMediaType.update(prev => ({
      ...prev,
      [campaignId]: type
    }));
  }

  getMediaTypeFilter(campaignId: number): string {
    return this.selectedMediaType()[campaignId] || 'ALL';
  }

  getFilteredTemplates(campaignId: number): WhatsappTemplate[] {
    let templates = this.campaignTemplates()[campaignId] || [];
    const filter = this.getMediaTypeFilter(campaignId);
    if (filter !== 'ALL') {
      templates = templates.filter(t => t.template_type?.toUpperCase() === filter);
    }
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      templates = templates.filter(t => 
        t.template_name.toLowerCase().includes(query) || 
        (t.template_type && t.template_type.toLowerCase().includes(query))
      );
    }
    return templates;
  }

  getTemplateCountByType(campaignId: number, type: string): number {
    let templates = this.campaignTemplates()[campaignId] || [];
    const filter = type;
    if (filter !== 'ALL') {
      templates = templates.filter(t => t.template_type?.toUpperCase() === filter);
    }
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      templates = templates.filter(t => 
        t.template_name.toLowerCase().includes(query) || 
        (t.template_type && t.template_type.toLowerCase().includes(query))
      );
    }
    return templates.length;
  }
  
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
    // Clear any obsolete template-level cooldowns
    try {
      localStorage.removeItem('whatsapp_cooldowns');
    } catch (e) {}

    this.checkCooldowns();
    this.timerRef = setInterval(() => this.checkCooldowns(), 1000);
  }

  checkCooldowns(): void {
    const storedStr = localStorage.getItem('whatsapp_number_cooldowns');
    if (!storedStr) {
      if (Object.keys(this.numberCooldowns()).length > 0) {
        this.numberCooldowns.set({});
      }
      return;
    }
    
    try {
      const stored: { [key: string]: number } = JSON.parse(storedStr);
      const now = Date.now();
      const updatedCooldowns: { [key: string]: number } = {};
      let hasChanges = false;
      let hasActiveCooldowns = false;
      
      for (const phone of Object.keys(stored)) {
        const timestamp = stored[phone];
        const elapsed = now - timestamp;
        
        if (elapsed < 60000) {
          updatedCooldowns[phone] = Math.ceil((60000 - elapsed) / 1000);
          hasActiveCooldowns = true;
        } else {
          delete stored[phone];
          hasChanges = true;
        }
      }
      
      this.numberCooldowns.set(updatedCooldowns);
      
      if (hasChanges) {
        if (hasActiveCooldowns) {
          localStorage.setItem('whatsapp_number_cooldowns', JSON.stringify(stored));
        } else {
          localStorage.removeItem('whatsapp_number_cooldowns');
        }
      }
    } catch (e) {
      console.error('Error parsing number cooldowns', e);
      localStorage.removeItem('whatsapp_number_cooldowns');
      this.numberCooldowns.set({});
    }
  }

  setNumberCooldown(phone: string): void {
    if (!phone) return;
    const cleanNum = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanNum.length !== 10) return;

    const storedStr = localStorage.getItem('whatsapp_number_cooldowns');
    let stored: { [key: string]: number } = {};
    if (storedStr) {
      try {
        stored = JSON.parse(storedStr);
      } catch (e) {}
    }
    
    stored[cleanNum] = Date.now();
    localStorage.setItem('whatsapp_number_cooldowns', JSON.stringify(stored));
    this.checkCooldowns();
  }

  setTemplateCooldown(templateId: number, phone?: string): void {
    const rawNum = phone || (templateId ? this.templateNumbers()[templateId] : '');
    if (rawNum) {
      this.setNumberCooldown(rawNum);
    }
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
    if (!template.id || !this.isValidNumber(template.id) || (this.cooldowns()[template.id] || 0) > 0) return;
    
    const rawNum = this.templateNumbers()[template.id];
    let num = rawNum;
    if (num.length === 10) {
      num = '91' + num;
    }
    
    const sendingState = this.isSending();
    this.isSending.set({ ...sendingState, [template.id]: true });

    this.templateService.triggerTest(template.id, num).subscribe({
      next: (res: any) => {
        // Record 60-second cooldown specifically for this phone number
        this.setNumberCooldown(rawNum);
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
