import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappAccountService } from '../../services/whatsapp-campaign.service';
import { WhatsappAccount } from '../../models/whatsapp-campaign.model';
import { ToastService } from '../../services/toast.service';
import { AddWhatsappAccountModalComponent } from '../modals/add-whatsapp-account-modal/add-whatsapp-account-modal.component';

@Component({
  selector: 'app-whatsapp-accounts',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AddWhatsappAccountModalComponent
  ],
  templateUrl: './whatsapp-accounts.component.html',
  styleUrl: './whatsapp-accounts.component.css'
})
export class WhatsappAccountsComponent implements OnInit {
  private accountService = inject(WhatsappAccountService);
  private toastService = inject(ToastService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');

  // Modals state
  isAccountModalOpen = signal<boolean>(false);
  selectedAccount = signal<WhatsappAccount | null>(null);

  // All accounts from service
  allAccounts = signal<WhatsappAccount[]>([]);
  isLoading = signal<boolean>(false);

  // Filtered accounts based on search query
  filteredAccounts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.allAccounts();

    return this.allAccounts().filter(a => 
      a.platform_name.toLowerCase().includes(query) ||
      a.whatsapp_number.toLowerCase().includes(query)
    );
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.filteredAccounts().length / this.pageSize()) || 1);

  // Paginated accounts for current page
  paginatedAccounts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredAccounts().slice(start, start + this.pageSize());
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
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.isLoading.set(true);
    this.accountService.getAccounts().subscribe({
      next: (res: any) => {
        if (res.status === 'success' || (Array.isArray(res) || res.data)) {
            const data = Array.isArray(res) ? res : (res.data || []);
            this.allAccounts.set(data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Error', 'Failed to load accounts.');
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

  openAddAccountModal(): void {
    this.selectedAccount.set(null);
    this.isAccountModalOpen.set(true);
  }

  openEditAccountModal(account: WhatsappAccount): void {
    this.selectedAccount.set(account);
    this.isAccountModalOpen.set(true);
  }

  closeAccountModal(): void {
    this.isAccountModalOpen.set(false);
  }

  onAccountAdded(): void {
    this.loadAccounts();
  }
}
