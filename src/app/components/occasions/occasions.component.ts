import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FoodBookingService } from '../../services/food-booking.service';

@Component({
  selector: 'app-occasions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './occasions.component.html',
  styleUrls: ['./occasions.component.css']
})
export class OccasionsComponent implements OnInit {
  private foodService = inject(FoodBookingService);

  occasions = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  
  newOccasionName = '';
  newOccasionStatus = true;
  showAddModal = false;
  editOccasionId = signal<number | null>(null);

  ngOnInit() {
    this.loadOccasions();
  }

  loadOccasions() {
    this.isLoading.set(true);
    this.foodService.getOccasions().subscribe({
      next: (res: any) => {
        this.occasions.set(res.length !== undefined ? res : res.results || []);
        this.isLoading.set(false);
      },
      error: err => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  openAddModal() {
    this.newOccasionName = '';
    this.newOccasionStatus = true;
    this.editOccasionId.set(null);
    this.showAddModal = true;
  }

  openEditModal(occ: any) {
    this.newOccasionName = occ.name;
    this.newOccasionStatus = occ.is_active;
    this.editOccasionId.set(occ.id);
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.editOccasionId.set(null);
  }

  saveOccasion() {
    if (!this.newOccasionName.trim()) return;
    this.isSaving.set(true);
    const name = this.newOccasionName.trim().toUpperCase();
    const payload = { name: name, is_active: this.newOccasionStatus };
    const editId = this.editOccasionId();

    const request = editId 
      ? this.foodService.updateOccasion(editId, payload)
      : this.foodService.createOccasion(payload);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeAddModal();
        this.loadOccasions();
      },
      error: err => {
        console.error(err);
        this.isSaving.set(false);
      }
    });
  }

  toggleActive(occ: any) {
    this.foodService.updateOccasion(occ.id, { is_active: !occ.is_active }).subscribe({
      next: () => this.loadOccasions(),
      error: err => console.error(err)
    });
  }
}
