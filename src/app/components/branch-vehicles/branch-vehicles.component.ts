import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BranchVehicleService } from '../../services/branch-vehicle.service';
import { BranchListService } from '../../services/branch-list.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-branch-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './branch-vehicles.component.html',
  styleUrl: './branch-vehicles.component.css'
})
export class BranchVehiclesComponent implements OnInit {
  private service = inject(BranchVehicleService);
  private branchListService = inject(BranchListService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  isAdmin = computed(() => this.authService.hasRole(['ADMIN']));
  userBranchId = computed(() => this.authService.currentUser()?.branch?.id || null);

  vehicles = signal<any[]>([]);
  branchesList = signal<any[]>([]);

  // Search, Filter & Pagination
  filterBranch = signal<string>('');
  filterVehicleType = signal<string>('');
  searchQuery = signal<string>('');
  vehicleTypes = ['SCOOTER', 'BIKE', 'CAR', 'VAN', 'BUS', 'DOST', 'TATA ACE'];
  currentPage = signal<number>(1);
  pageNumbers = computed(() => {
    const pages = [];
    const maxPages = 5;
    let start = Math.max(1, this.currentPage() - 2);
    let end = Math.min(this.totalPages(), start + maxPages - 1);
    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  pageSize = signal<number>(10);
  totalItems = signal<number>(0);
  Math = Math;

  // Modal State
  showModal = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedVehicleId = signal<number | null>(null);
  currentVehicle = signal<any>(null);
  submitting = signal<boolean>(false);

  vehicleForm: FormGroup;
  selectedFiles: { [key: string]: File | null } = {
    insurance_document: null,
    fitness_certificate_document: null,
    pollution_certificate_document: null
  };

  constructor() {
    this.vehicleForm = this.fb.group({
      branch: ['', Validators.required],
      registered_name: ['', Validators.required],
      registered_mobile_no: ['', Validators.required],
      registered_vehicle_no: ['', Validators.required],
      vehicle_type: ['', Validators.required],
      vehicle_user_name: ['', Validators.required],
      insurance_start_date: [''],
      insurance_end_date: [''],
      fitness_certificate_start_date: [''],
      fitness_certificate_end_date: [''],
      pollution_certificate_start_date: [''],
      pollution_certificate_end_date: [''],
      rc_start_date: [''],
      rc_end_date: [''],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.loadBranches();
    }
    this.loadVehicles();
  }

  handlePhoneInput(event: any, fieldName: string): void {
    const input = event.target;
    const value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    input.value = value;
    this.vehicleForm.get(fieldName)?.setValue(value);
  }

  loadBranches(): void {
    this.branchListService.getData(1, 1000).subscribe({
      next: (res: any) => {
        if (res?.results) {
          this.branchesList.set(res.results.filter((b: any) => b.is_active));
        } else if (res?.data) {
          this.branchesList.set(res.data.filter((b: any) => b.is_active));
        } else if (Array.isArray(res)) {
          this.branchesList.set(res.filter((b: any) => b.is_active));
        }
      },
      error: (err) => console.error('Error loading branches', err)
    });
  }

  loadVehicles(): void {
    const params: any = {
      page: this.currentPage(),
      page_size: this.pageSize()
    };
    if (this.filterBranch()) params.branch = this.filterBranch();
    if (this.filterVehicleType()) params.vehicle_type = this.filterVehicleType();
    if (this.searchQuery()) params.search = this.searchQuery();

    this.service.getVehicles(params).subscribe({
      next: (res) => {
        if (res?.results) {
          this.vehicles.set(res.results);
          this.totalItems.set(res.count || 0);
        } else if (res?.data) {
          this.vehicles.set(res.data);
          this.totalItems.set(res.data.length);
        } else if (Array.isArray(res)) {
          this.vehicles.set(res);
          this.totalItems.set(res.length);
        } else {
          this.vehicles.set([]);
          this.totalItems.set(0);
        }
      },
      error: (err) => {
        console.error('Error loading vehicles', err);
        alert('Failed to load vehicles');
      }
    });
  }

  exportXLSX() {
    const filters: any = {};
    if (this.filterBranch()) filters.branch = this.filterBranch();
    if (this.filterVehicleType()) filters.vehicle_type = this.filterVehicleType();
    if (this.searchQuery()) filters.search = this.searchQuery();

    this.service.exportVehicles(filters).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `branch_vehicles_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error exporting vehicles', err);
        alert('Failed to export vehicles');
      }
    });
  }

  onSearch(val: string) {
    this.searchQuery.set(val);
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onFilterBranch(val: string) {
    this.filterBranch.set(val);
    this.currentPage.set(1);
    this.loadVehicles();
  }

  onFilterVehicleType(val: string) {
    this.filterVehicleType.set(val);
    this.currentPage.set(1);
    this.loadVehicles();
  }

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  setPage(page: number): void { this.changePage(page); }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      this.loadVehicles();
    }
  }

  openAddModal() {
    this.isEditMode.set(false);
    this.selectedVehicleId.set(null);
    this.currentVehicle.set(null);
    this.vehicleForm.reset({ is_active: true });
    
    if (!this.isAdmin() && this.userBranchId()) {
      this.vehicleForm.patchValue({ branch: this.userBranchId() });
    }
    
    this.selectedFiles = {
      insurance_document: null,
      fitness_certificate_document: null,
      pollution_certificate_document: null,
      rc_certificate_document: null
    };
    this.showModal.set(true);
  }

  openEditModal(vehicle: any) {
    this.isEditMode.set(true);
    this.selectedVehicleId.set(vehicle.id);
    this.currentVehicle.set(vehicle);
    this.vehicleForm.patchValue({
      branch: vehicle.branch,
      registered_name: vehicle.registered_name,
      registered_mobile_no: vehicle.registered_mobile_no,
      registered_vehicle_no: vehicle.registered_vehicle_no,
      vehicle_type: vehicle.vehicle_type,
      vehicle_user_name: vehicle.vehicle_user_name,
      insurance_start_date: vehicle.insurance_start_date,
      insurance_end_date: vehicle.insurance_end_date,
      fitness_certificate_start_date: vehicle.fitness_certificate_start_date,
      fitness_certificate_end_date: vehicle.fitness_certificate_end_date,
      pollution_certificate_start_date: vehicle.pollution_certificate_start_date,
      pollution_certificate_end_date: vehicle.pollution_certificate_end_date,
      rc_start_date: vehicle.rc_start_date,
      rc_end_date: vehicle.rc_end_date,
      is_active: vehicle.is_active
    });
    this.selectedFiles = {
      insurance_document: null,
      fitness_certificate_document: null,
      pollution_certificate_document: null,
      rc_certificate_document: null
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onFileChange(event: any, fieldName: string) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles[fieldName] = file;
    }
  }

  saveVehicle() {
    if (this.vehicleForm.invalid) {
      alert('Please fill out all required fields correctly.');
      return;
    }

    this.submitting.set(true);
    const formData = new FormData();
    const values = this.vehicleForm.value;

    const fieldsToUppercase = ['registered_name', 'registered_vehicle_no', 'vehicle_type', 'vehicle_user_name'];

    Object.keys(values).forEach(key => {
      if (values[key] !== null && values[key] !== '') {
        let val = values[key];
        if (fieldsToUppercase.includes(key) && typeof val === 'string') {
          val = val.toUpperCase();
        }
        formData.append(key, val);
      }
    });

    Object.keys(this.selectedFiles).forEach(key => {
      const file = this.selectedFiles[key];
      if (file) {
        formData.append(key, file);
      }
    });

    if (this.isEditMode() && this.selectedVehicleId()) {
      this.service.updateVehicle(this.selectedVehicleId()!, formData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeModal();
          this.loadVehicles();
        },
        error: (err) => {
          this.submitting.set(false);
          console.error(err);
          alert('Error updating vehicle');
        }
      });
    } else {
      this.service.createVehicle(formData).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeModal();
          this.loadVehicles();
        },
        error: (err) => {
          this.submitting.set(false);
          console.error(err);
          alert('Error creating vehicle');
        }
      });
    }
  }

  deleteVehicle(id: number) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      this.service.deleteVehicle(id).subscribe({
        next: () => this.loadVehicles(),
        error: (err) => {
          console.error(err);
          alert('Failed to delete vehicle');
        }
      });
    }
  }

  getAbsoluteUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = 'http://127.0.0.1:8000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
