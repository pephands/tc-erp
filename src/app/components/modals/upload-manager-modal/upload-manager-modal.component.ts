import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../../services/user-list.service';

@Component({
  selector: 'app-upload-manager-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-manager-modal.component.html',
  styleUrl: './upload-manager-modal.component.css'
})
export class UploadManagerModalComponent {
  private userListService = inject(UserListService);
  
  @Output() close = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<void>();

  selectedExcelFile: File | null = null;
  isUploading = false;

  onClose(): void {
    if (!this.isUploading) {
      this.close.emit();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedExcelFile = target.files[0];
    }
  }

  onUploadSubmit(): void {
    if (!this.selectedExcelFile) {
      alert('Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }

    this.isUploading = true;
    this.userListService.uploadManagersExcel(this.selectedExcelFile).subscribe({
      next: (res: any) => {
        this.isUploading = false;
        alert(res.message || 'Successfully processed Excel file. Manager data imported!');
        this.uploaded.emit();
      },
      error: (err: any) => {
        this.isUploading = false;
        console.error('Error uploading excel', err);
        const errorMsg = err.error?.message || 'Failed to upload Excel file. Please check format and try again.';
        alert(errorMsg);
      }
    });
  }
}
