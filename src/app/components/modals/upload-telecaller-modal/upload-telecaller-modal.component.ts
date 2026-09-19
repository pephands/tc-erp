import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../../services/user-list.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-upload-telecaller-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-telecaller-modal.component.html',
  styleUrl: './upload-telecaller-modal.component.css'
})
export class UploadTelecallerModalComponent {
  private userListService = inject(UserListService);
  private toastService = inject(ToastService);
  
  @Output() close = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<void>();

  selectedExcelFile = signal<File | null>(null);
  isUploading = signal<boolean>(false);
  isDragOver = signal<boolean>(false);
  uploadError = signal<string | null>(null);

  onClose(): void {
    if (!this.isUploading()) {
      this.close.emit();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.validateAndSetFile(target.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      this.validateAndSetFile(event.dataTransfer.files[0]);
    }
  }

  private validateAndSetFile(file: File): void {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      this.uploadError.set('Invalid file type. Please upload a valid Excel file (.xls or .xlsx).');
      this.toastService.error('Invalid File', 'Only .xls and .xlsx files are supported.');
      return;
    }
    this.uploadError.set(null);
    this.selectedExcelFile.set(file);
  }

  removeSelectedFile(): void {
    this.selectedExcelFile.set(null);
    this.uploadError.set(null);
  }

  getFileSizeString(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadSampleExcel(): void {
    this.userListService.downloadSampleTemplate('telecaller').subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'sample_telecallers.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toastService.info('Sample Downloaded', 'sample_telecallers.xlsx downloaded from server.');
      },
      error: () => {
        // Fallback to generating template file directly
        const headers = [
          'Employee ID', 'Full Name', 'Official Name', 'Mobile Number', 'Official Number',
          'Gender', 'Status', 'Role', 'Slab', 'Salary',
          'Date of Joining', 'Date of Relieving', 'Date of Rejoining',
          'Bank Account Holder Name', 'Bank Account Number', 'IFSC Code', 'Address', 'Branch Name'
        ];
        const sampleRows = [
          ['EMP001', 'ABI M', 'Abinaya M', '9876543210', '044-24567890', 'Female', 'Active', 'Telecaller', 'SLAB-1', '12000', '2024-01-15', '', '', 'ABI M', '987654321012', 'SBIN0001234', '123 Main Street, Chennai', 'ADAMBAKKAM'],
          ['EMP002', 'ALIYA K', 'Aliya Khan', '7395949844', '044-24567891', 'Female', 'Active', 'Telecaller', 'SLAB-2', '12500', '2023-06-01', '', '', 'ALIYA K', '987654321013', 'HDFC0005678', '45 Park Avenue, Madurai', 'ADAMBAKKAM']
        ];

        let csvContent = headers.join(',') + '\n';
        sampleRows.forEach(row => {
          csvContent += row.map(val => `"${val}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'sample_telecallers.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toastService.info('Sample Downloaded', 'Sample template file downloaded successfully.');
      }
    });
  }

  onUploadSubmit(): void {
    const file = this.selectedExcelFile();
    if (!file) {
      this.toastService.error('Validation Error', 'Please select an Excel file (.xls, .xlsx) to upload.');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    this.userListService.uploadTelecallersExcel(file).subscribe({
      next: (res: any) => {
        this.isUploading.set(false);
        const created = res.data?.created ?? 0;
        const updated = res.data?.updated ?? 0;
        const msg = res.message || `Processed successfully. Created: ${created}, Updated: ${updated}`;
        
        this.toastService.success('Upload Successful', msg);
        this.uploaded.emit();
        this.close.emit();
      },
      error: (err: any) => {
        this.isUploading.set(false);
        console.error('Error uploading telecallers excel', err);
        const errorMsg = err.error?.message || 'Failed to process Excel file. Please verify file format and columns.';
        this.uploadError.set(errorMsg);
        this.toastService.error('Upload Failed', errorMsg);
      }
    });
  }
}
