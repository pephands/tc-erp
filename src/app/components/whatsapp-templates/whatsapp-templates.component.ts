import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WhatsappTemplateService } from '../../services/whatsapp-template.service';
import { ToastService } from '../../services/toast.service';
import { WhatsappTemplate } from '../../models/whatsapp-campaign.model';
import { AddWhatsappTemplateModalComponent } from '../modals/add-whatsapp-template-modal/add-whatsapp-template-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, AddWhatsappTemplateModalComponent],
  selector: 'app-whatsapp-templates',
  styleUrl: './whatsapp-templates.component.css',
  templateUrl: './whatsapp-templates.component.html',
})
export class WhatsappTemplates implements OnInit {
  private templateService = inject(WhatsappTemplateService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  campaignId = signal<number | null>(null);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');
  
  // Filter state
  filterTemplateType = signal<string>('');
  filterIsActive = signal<string>('');

  allTemplates = signal<WhatsappTemplate[]>([]);
  isLoading = signal<boolean>(false);
  isModalOpen = signal<boolean>(false);
  selectedTemplateForEdit = signal<WhatsappTemplate | null>(null);
  
  isDeleteModalOpen = signal<boolean>(false);
  templateToDelete = signal<WhatsappTemplate | null>(null);

  filteredTemplates = computed(() => {
    let list = this.allTemplates();

    // Active Status filter
    if (this.filterIsActive() === 'true') {
      list = list.filter(t => t.is_active !== false);
    } else if (this.filterIsActive() === 'false') {
      list = list.filter(t => t.is_active === false);
    }

    // Template Type filter
    if (this.filterTemplateType()) {
      list = list.filter(t => t.template_type === this.filterTemplateType());
    }

    // Search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(t => 
        (t.meta_template_name && t.meta_template_name.toLowerCase().includes(query)) ||
        (t.template_name && t.template_name.toLowerCase().includes(query))
      );
    }

    return list;
  });

  paginatedTemplates = computed(() => {
    const list = this.filteredTemplates();
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return list.slice(startIndex, startIndex + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredTemplates().length / this.pageSize()) || 1;
  });

  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('campaignId');
      if (id) {
        this.campaignId.set(Number(id));
        this.loadTemplates();
      }
    });
  }

  loadTemplates(): void {
    const cid = this.campaignId();
    if (!cid) return;

    this.isLoading.set(true);
    // Fetch all for now to do client-side filtering, or adapt if API uses pagination
    this.templateService.getTemplates(cid).subscribe({
      next: (res: any) => {
        const results = res.data?.results || res.results || res.data || [];
        this.allTemplates.set(results);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.toastService.error('Error', err.error?.message || 'Failed to load templates');
        this.isLoading.set(false);
      }
    });
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  goBack(): void {
    this.router.navigate(['/whatsapp-campaigns']);
  }

  openAddModal(): void {
    this.selectedTemplateForEdit.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(template: WhatsappTemplate): void {
    this.selectedTemplateForEdit.set(template);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedTemplateForEdit.set(null);
  }

  onTemplateAdded(): void {
    this.loadTemplates();
  }

  openDeleteConfirm(template: WhatsappTemplate): void {
    this.templateToDelete.set(template);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.templateToDelete.set(null);
  }

  confirmDelete(): void {
    const template = this.templateToDelete();
    if (template && template.id) {
      this.templateService.deleteData(template.id).subscribe({
        next: () => {
          this.toastService.success('Success', 'Template deleted successfully');
          this.loadTemplates();
          this.closeDeleteModal();
        },
        error: (err: any) => {
          this.toastService.error('Error', err.error?.message || 'Failed to delete template');
          this.closeDeleteModal();
        }
      });
    }
  }

  isTestModalOpen = signal<boolean>(false);
  testNumber = signal<string>('');
  templateToTest = signal<WhatsappTemplate | null>(null);
  isTesting = signal<boolean>(false);

  openTestModal(template: WhatsappTemplate): void {
    this.templateToTest.set(template);
    this.testNumber.set('');
    this.isTestModalOpen.set(true);
  }

  closeTestModal(): void {
    this.isTestModalOpen.set(false);
    this.templateToTest.set(null);
  }

  submitTest(): void {
    const template = this.templateToTest();
    const num = this.testNumber().trim();
    if (!template || !template.id || !num) return;

    this.isTesting.set(true);
    this.templateService.triggerTest(template.id, num).subscribe({
      next: (res: any) => {
        this.toastService.success('Success', res.message || 'Test message sent successfully!');
        this.isTesting.set(false);
        this.closeTestModal();
      },
      error: (err: any) => {
        this.toastService.error('Error', err.error?.message || 'Failed to send test message');
        this.isTesting.set(false);
      }
    });
  }
}
