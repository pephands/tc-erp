import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BranchExpenseCategoryService } from '../../services/branch-expense-category.service';
import { BranchExpenseCategory } from '../../models/branch-expense-category.model';
import { VehicleTypeService } from '../../services/vehicle-type.service';
import { VehicleType } from '../../models/vehicle-type.model';

@Component({
  selector: 'app-branch-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './branch-settings.component.html',
  styleUrl: './branch-settings.component.css',
})
export class BranchSettingsComponent implements OnInit {
  activeTab = signal<'expense-categories' | 'vehicle-types'>('expense-categories');
  private categoryService = inject(BranchExpenseCategoryService);
  private vehicleTypeService = inject(VehicleTypeService);
  private fb = inject(FormBuilder);

  categories = this.categoryService.categoriesSignal;
  vehicleTypes = this.vehicleTypeService.vehicleTypesSignal;
  categoryForm: FormGroup;
  vehicleTypeForm: FormGroup;
  isSubmitting = false;
  isVehicleSubmitting = false;

  constructor() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      is_active: [true]
    });
    this.vehicleTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      is_active: [true]
    });
  }

  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  ngOnInit(): void {
    this.loadCategories();
    this.loadVehicleTypes();
  }

  setActiveTab(tab: 'expense-categories' | 'vehicle-types'): void {
    this.activeTab.set(tab);
  }

  loadCategories(): void {
    this.categoryService.fetchCategories().subscribe({
      error: (err: any) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  loadVehicleTypes(): void {
    this.vehicleTypeService.fetchVehicleTypes().subscribe({
      error: (err: any) => {
        console.error('Failed to load vehicle types', err);
      }
    });
  }

  onNameInput(event: any): void {
    const value = event.target.value.toUpperCase();
    this.categoryForm.patchValue({ name: value }, { emitEvent: false });
  }

  onVehicleNameInput(event: any): void {
    const value = event.target.value.toUpperCase();
    this.vehicleTypeForm.patchValue({ name: value }, { emitEvent: false });
  }

  triggerToast(msg: string): void {
    this.toastMessage.set(msg);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3500);
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) return;

    this.isSubmitting = true;
    const formData = { ...this.categoryForm.value };
    formData.name = formData.name.toUpperCase();

    this.categoryService.createCategory(formData).subscribe({
      next: () => {
        this.categoryForm.reset({ is_active: true });
        this.loadCategories();
        this.isSubmitting = false;
        this.triggerToast('Category added successfully.');
      },
      error: (err: any) => {
        console.error('Failed to create category', err);
        this.triggerToast('Failed to create category.');
        this.isSubmitting = false;
      }
    });
  }

  onVehicleSubmit(): void {
    if (this.vehicleTypeForm.invalid) return;

    this.isVehicleSubmitting = true;
    const formData = { ...this.vehicleTypeForm.value };
    formData.name = formData.name.toUpperCase();

    this.vehicleTypeService.createVehicleType(formData).subscribe({
      next: () => {
        this.vehicleTypeForm.reset({ is_active: true });
        this.loadVehicleTypes();
        this.isVehicleSubmitting = false;
        this.triggerToast('Vehicle Type added successfully.');
      },
      error: (err: any) => {
        console.error('Failed to create vehicle type', err);
        this.triggerToast('Failed to create vehicle type.');
        this.isVehicleSubmitting = false;
      }
    });
  }

  toggleActive(category: BranchExpenseCategory): void {
    const newStatus = !category.is_active;
    this.categoryService.updateCategory(category.id, { name: category.name, is_active: newStatus }).subscribe({
      next: () => {
        category.is_active = newStatus;
        this.triggerToast('Category status updated.');
      },
      error: (err: any) => {
        console.error('Failed to update category', err);
        this.triggerToast('Failed to update category status.');
      }
    });
  }

  toggleVehicleActive(vType: VehicleType): void {
    const newStatus = !vType.is_active;
    if (vType.id) {
      this.vehicleTypeService.updateVehicleType(vType.id, { name: vType.name, is_active: newStatus }).subscribe({
        next: () => {
          vType.is_active = newStatus;
          this.triggerToast('Vehicle type status updated.');
        },
        error: (err: any) => {
          console.error('Failed to update vehicle type', err);
          this.triggerToast('Failed to update vehicle type status.');
        }
      });
    }
  }
}
