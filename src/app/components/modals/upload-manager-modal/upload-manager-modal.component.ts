import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../../services/user-list.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-upload-manager-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-manager-modal.component.html',
  styleUrl: './upload-manager-modal.component.css'
})
export class UploadManagerModalComponent {
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
    this.userListService.downloadSampleTemplate('manager').subscribe({
      next: (blob: Blob) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'sample_managers.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toastService.info('Sample Downloaded', 'sample_managers.xlsx downloaded from server.');
      },
      error: () => {
        const headers = [
          'Employee ID', 'Full Name', 'Official Name', 'Mobile Number', 'Official Number',
          'Gender', 'Status', 'Role', 'Slab', 'Salary',
          'Date of Joining', 'Date of Relieving', 'Date of Rejoining',
          'Bank Account Holder Name', 'Bank Account Number', 'IFSC Code', 'Address', 'Branch Name'
        ];
        const sampleRows = [
          ['EMP101', 'MOHAN KUMAR', 'Mohan Kumar', '9876543200', '044-24567899', 'Male', 'Active', 'Manager', '', '25000', '2021-04-01', '', '', 'MOHAN KUMAR', '987654321099', 'SBIN0001234', '10 Admin Plaza, Chennai', 'ADAMBAKKAM'],
          ['EMP102', 'SARAVANAN S', 'Saravanan S', '9876543201', '044-24567898', 'Male', 'Active', 'Manager', '', '28000', '2020-08-15', '', '', 'SARAVANAN S', '987654321098', 'HDFC0005678', '22 Executive Heights, Madurai', 'ADAMBAKKAM']
        ];

        let csvContent = headers.join(',') + '\n';
        sampleRows.forEach(row => {
          csvContent += row.map(val => `"${val}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'sample_managers.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toastService.info('Sample Downloaded', 'Sample manager template downloaded.');
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

    this.userListService.uploadManagersExcel(file).subscribe({
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
        console.error('Error uploading managers excel', err);
        const errorMsg = err.error?.message || 'Failed to process Excel file. Please verify file format and columns.';
        this.uploadError.set(errorMsg);
        this.toastService.error('Upload Failed', errorMsg);
      }
    });
  }
}
