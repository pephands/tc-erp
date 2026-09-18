import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappCampaignService } from '../../services/whatsapp-campaign.service';
import { BranchListService } from '../../services/branch-list.service';
import { WhatsappCampaign } from '../../models/whatsapp-campaign.model';
import { ToastService } from '../../services/toast.service';
import { AddWhatsappCampaignModalComponent } from '../modals/add-whatsapp-campaign-modal/add-whatsapp-campaign-modal.component';
import { WhatsappCampaignCreateService } from '../../services/whatsapp-campaign-create.service';

@Component({
  selector: 'app-whatsapp-campaigns',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AddWhatsappCampaignModalComponent
  ],
  templateUrl: './whatsapp-campaigns.component.html',
  styleUrl: './whatsapp-campaigns.component.css'
})
export class WhatsappCampaignsComponent implements OnInit {
  private campaignService = inject(WhatsappCampaignService);
  private campaignCreateService = inject(WhatsappCampaignCreateService);
  private branchListService = inject(BranchListService);
  private toastService = inject(ToastService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');

  // Modals state
  isModalOpen = signal<boolean>(false);
  selectedCampaignForEdit = signal<WhatsappCampaign | undefined>(undefined);

  // Filter state
  filterBranch = signal<string>('');
  filterIsActive = signal<string>('');
  filterTemplateType = signal<string>('');
  branches = signal<any[]>([]);

  // All campaigns from service
  allCampaigns = signal<WhatsappCampaign[]>([]);
  isLoading = signal<boolean>(false);

  // Filtered campaigns
  filteredCampaigns = computed(() => {
    let list = this.allCampaigns();

    // Branch filter
    if (this.filterBranch()) {
      list = list.filter(c => c.branch.toString() === this.filterBranch());
    }

    // Active Status filter
    if (this.filterIsActive() === 'true') {
      list = list.filter(c => c.is_active !== false);
    } else if (this.filterIsActive() === 'false') {
      list = list.filter(c => c.is_active === false);
    }

    // Template Type filter
    if (this.filterTemplateType()) {
      list = list.filter(c => c.template_type === this.filterTemplateType());
    }

    // Search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(c => 
        (c.campaign_name && c.campaign_name.toLowerCase().includes(query)) ||
        (c.template_type && c.template_type.toLowerCase().includes(query)) ||
        (c.meta_template_name && c.meta_template_name.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.filteredCampaigns().length / this.pageSize()) || 1);

  // Paginated campaigns for current page
  paginatedCampaigns = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCampaigns().slice(start, start + this.pageSize());
  });

  // Page Numbers Array for Pagination Buttons (1, 2, 3...)
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadBranches();
    this.loadCampaigns();
  }

  loadBranches(): void {
    this.branchListService.getData().subscribe({
      next: (res: any) => {
        this.branches.set(res.data || res);
      }
    });
  }

  loadCampaigns(): void {
    this.isLoading.set(true);
    // Request all campaigns regardless of active status by passing query param if possible, 
    // but the backend view is already modified to accept all if not specified
    this.campaignService.getCampaigns().subscribe({
      next: (res: any) => {
        if (res.status === 'success' || (Array.isArray(res) || res.data)) {
            const data = Array.isArray(res) ? res : (res.data || []);
            this.allCampaigns.set(data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toastService.error('Error', 'Failed to load campaigns.');
        this.isLoading.set(false);
      }
    });
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  openAddModal(): void {
    this.selectedCampaignForEdit.set(undefined);
    this.isModalOpen.set(true);
  }

  openEditModal(campaign: WhatsappCampaign): void {
    this.selectedCampaignForEdit.set(campaign);
    this.isModalOpen.set(true);
  }

  deleteCampaign(campaign: WhatsappCampaign): void {
    if (confirm(`Are you sure you want to delete campaign "${campaign.campaign_name}"?`)) {
      if (campaign.id) {
        this.campaignCreateService.deleteData(campaign.id).subscribe({
          next: () => {
            this.toastService.success('Success', 'Campaign deleted successfully');
            this.loadCampaigns();
          },
          error: (err) => {
            this.toastService.error('Error', err.error?.message || 'Failed to delete campaign');
          }
        });
      }
    }
  }

  testCampaign(campaign: WhatsappCampaign): void {
    if (!campaign.id) return;
    
    const number = window.prompt(`Enter a WhatsApp number to test campaign "${campaign.campaign_name}":\n(e.g., 9190424XXXXX)`);
    if (number && number.trim() !== '') {
      this.campaignCreateService.triggerTest(campaign.id, number.trim()).subscribe({
        next: (res: any) => {
          this.toastService.success('Success', res.message || 'Test message sent successfully!');
        },
        error: (err: any) => {
          this.toastService.error('Error', err.error?.message || 'Failed to send test message');
        }
      });
    }
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedCampaignForEdit.set(undefined);
  }

  onCampaignAdded(): void {
    this.loadCampaigns();
  }
}
