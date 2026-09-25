import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../services/user-list.service';
import { BranchListService } from '../../services/branch-list.service';
import { RoleListService } from '../../services/role-list.service';
import { Manager } from '../../models/manager.model';
import { AddManagerModalComponent } from '../modals/add-manager-modal/add-manager-modal.component';
import { EditManagerModalComponent } from '../modals/edit-manager-modal/edit-manager-modal.component';
import { UploadManagerModalComponent } from '../modals/upload-manager-modal/upload-manager-modal.component';

@Component({
  selector: 'app-managers',
  standalone: true,
  imports: [CommonModule, FormsModule, AddManagerModalComponent, EditManagerModalComponent, UploadManagerModalComponent],
  templateUrl: './managers.component.html',
  styleUrl: './managers.component.css'
})
export class ManagersComponent implements OnInit {
  private userListService = inject(UserListService);
  private branchService = inject(BranchListService);
  private roleService = inject(RoleListService);

  // Pagination & Filter state
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');
  totalCount = signal<number>(0);
  
  // Data State
  managers = signal<Manager[]>([]);

  // Modal open states
  isAddModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  isUploadModalOpen = signal<boolean>(false);

  // Selected manager for editing
  selectedManagerForEdit = signal<Manager | null>(null);

  // Branch options
  branches = signal<any[]>([]);

  // Role options
  roles = signal<any[]>([]);

  constructor() {
    this.branchService.getData(1, 1000).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || (Array.isArray(res) || res.data)) {
            const data = Array.isArray(res) ? res : (res.data || []);
            this.branches.set(data);
        }
      }
    });

    this.roleService.getRoles().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res.data || res.results || []);
        this.roles.set(data);
      }
    });
  }

  ngOnInit() {
    this.loadManagers();
  }

  // Load Managers from API
  private searchTimeout: any;
  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    
    // Debounce search
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadManagers();
    }, 400);
  }

  loadManagers() {
    this.userListService.getUsers(null, 'TL', this.currentPage(), this.pageSize(), this.searchQuery()).subscribe({
      next: (res: any) => {
        const rawData = res.results || [];
        const count = res.count || 0;
        
        this.totalCount.set(count);
        
        const mapped: Manager[] = rawData.map((u: any) => ({
          id: String(u.id),
          employeeId: u.username,
          fullName: u.full_name,
          mobile: u.phone || '',
          officialNumber: u.office_phone || '',
          gender: u.gender || 'Male',
          role: u.roles && u.roles.length ? u.roles[0].name : 'Team Lead',
          slab: u.slab || '',
          branch: u.branch ? u.branch.name : '',
          salary: u.salary || '0',
          dateOfJoining: u.date_of_joining || '',
          dateOfRelieving: u.date_of_relieving || '',
          email: u.email || '',
          bankAccountNumber: u.bank_account_number || '',
          bankHolderName: u.bank_holder_name || '',
          bankIfscCode: u.bank_ifsc_code || '',
          address: u.address || '',
          status: u.status || 'Active',
          otpDetails: u.otp_details || ''
        }));
        
        this.managers.set(mapped);
      },
      error: (err) => console.error("Error fetching managers", err)
    });
  }

  // Total pages
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  // Page Numbers Array for Pagination Buttons (1, 2, 3...)
  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadManagers();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadManagers();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadManagers();
    }
  }

  // --- Add Manager Modal ---
  openAddModal(): void {
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  // --- Edit / Update User Details Modal (Matching Screenshot) ---
  openEditModal(manager: Manager): void {
    this.selectedManagerForEdit.set(manager);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedManagerForEdit.set(null);
  }



  // --- Upload Excel Modal ---
  openUploadModal(): void {
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    this.isUploadModalOpen.set(false);
  }

  onUploadComplete(): void {
    this.closeUploadModal();
    this.loadManagers();
  }

  // Toggle Manager Status
  onToggleStatus(id: string, currentStatus: string): void {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const actionStr = currentStatus === 'Active' ? 'deactivate' : 'activate';
    
    if (confirm(`Are you sure you want to ${actionStr} Manager ID ${id}?`)) {
      this.userListService.toggleUserStatus(id, newStatus).subscribe({
        next: (res) => {
          alert(`Manager ${id} has been ${actionStr}d successfully.`);
          this.loadManagers();
        },
        error: (err) => {
          console.error(`Error ${actionStr}ing manager`, err);
          alert(`Failed to ${actionStr} manager. Please try again.`);
        }
      });
    }
  }
}
