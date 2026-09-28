import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BranchExpenseCategoryService } from '../../services/branch-expense-category.service';
import { BranchExpenseCategory } from '../../models/branch-expense-category.model';

@Component({
  selector: 'app-branch-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './branch-settings.component.html',
  styleUrl: './branch-settings.component.css',
})
export class BranchSettingsComponent implements OnInit {
  private categoryService = inject(BranchExpenseCategoryService);
  private fb = inject(FormBuilder);

  categories = this.categoryService.categoriesSignal;
  categoryForm: FormGroup;
  isSubmitting = false;

  constructor() {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      is_active: [true]
    });
  }

  toastMessage = signal<string>('');
  showToast = signal<boolean>(false);

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.fetchCategories().subscribe({
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  onNameInput(event: any): void {
    const value = event.target.value.toUpperCase();
    this.categoryForm.patchValue({ name: value }, { emitEvent: false });
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
      error: (err) => {
        console.error('Failed to create category', err);
        this.triggerToast('Failed to create category.');
        this.isSubmitting = false;
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
      error: (err) => {
        console.error('Failed to update category', err);
        this.triggerToast('Failed to update category status.');
      }
    });
  }
}
