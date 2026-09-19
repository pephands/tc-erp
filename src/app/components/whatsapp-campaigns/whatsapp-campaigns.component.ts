import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  private router = inject(Router);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');

  // Modals state
  isModalOpen = signal<boolean>(false);
  selectedCampaignForEdit = signal<WhatsappCampaign | undefined>(undefined);
  
  isDeleteModalOpen = signal<boolean>(false);
  campaignToDelete = signal<WhatsappCampaign | null>(null);

  // Filter state
  filterBranch = signal<string>('');
  filterIsActive = signal<string>('');
  branches = signal<any[]>([]);

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterBranch.set('');
    this.filterIsActive.set('');
    this.currentPage.set(1);
  }

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

    // Search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(c => 
        (c.campaign_name && c.campaign_name.toLowerCase().includes(query)) ||
        (c.description && c.description.toLowerCase().includes(query))
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

  openDeleteConfirm(campaign: WhatsappCampaign): void {
    this.campaignToDelete.set(campaign);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.campaignToDelete.set(null);
  }

  confirmDelete(): void {
    const campaign = this.campaignToDelete();
    if (campaign && campaign.id) {
      this.campaignCreateService.deleteData(campaign.id).subscribe({
        next: () => {
          this.toastService.success('Success', 'Campaign deleted successfully');
          this.loadCampaigns();
          this.closeDeleteModal();
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Failed to delete campaign');
          this.closeDeleteModal();
        }
      });
    }
  }

  viewTemplates(campaign: WhatsappCampaign): void {
    if (!campaign.id) return;
    this.router.navigate(['/whatsapp-campaigns', campaign.id, 'templates']);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedCampaignForEdit.set(undefined);
  }

  onCampaignAdded(): void {
    this.loadCampaigns();
  }
}
