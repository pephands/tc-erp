import { Component, EventEmitter, Output, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BranchCreateService } from '../../../services/branch-create.service';
import { BranchUpdateService } from '../../../services/branch-update.service';
import { ToastService } from '../../../services/toast.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Branch } from '../../../models/branch.model';

@Component({
  selector: 'app-add-branch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-branch-modal.component.html',
  styleUrl: './add-branch-modal.component.css'
})
export class AddBranchModalComponent implements OnInit {
  @Input() editBranch?: Branch;
  @Output() closeModal = new EventEmitter<void>();
  @Output() branchAdded = new EventEmitter<void>();

  private branchCreateService = inject(BranchCreateService);
  private branchUpdateService = inject(BranchUpdateService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  // Form Fields
  formBranchId: number | null = null;
  formName = '';
  formCode = '';
  formPhone = '';
  formEmail = '';
  formAddress = '';
  formLat: number | null = null;
  formLng: number | null = null;
  formRadius: number = 200;
  formIpValidation: boolean = true;
  formLocationValidation: boolean = true;

  // IPs array
  ips = signal<{ ip: string; label: string }[]>([{ ip: '', label: 'Main Office' }]);

  isSubmitting = signal(false);
  isDetectingLocation = signal(false);
  isDetectingIp = signal(false);

  // Map URL
  getMapUrl(): SafeResourceUrl | null {
    if (this.formLat === null || this.formLng === null || isNaN(this.formLat) || isNaN(this.formLng)) return null;
    const url = `https://maps.google.com/maps?q=${this.formLat},${this.formLng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    if (this.editBranch) {
      this.formBranchId = this.editBranch.branch_id ?? null;
      this.formName = this.editBranch.name;
      this.formCode = this.editBranch.code;
      this.formPhone = this.editBranch.phone || '';
      this.formEmail = this.editBranch.email || '';
      this.formAddress = this.editBranch.address || '';
      this.formLat = this.editBranch.latitude ?? null;
      this.formLng = this.editBranch.longitude ?? null;
      this.formRadius = this.editBranch.geofence_radius_meters ?? 200;
      this.formIpValidation = this.editBranch.ip_validation_enabled ?? true;
      this.formLocationValidation = this.editBranch.location_validation_enabled ?? true;

      if (this.editBranch.allowed_ips && this.editBranch.allowed_ips.length > 0) {
        this.ips.set(this.editBranch.allowed_ips.map(ip => ({ ip: ip.ip_address, label: ip.label })));
      }
    }
  }

  addIpField(): void {
    this.ips.update(current => [...current, { ip: '', label: '' }]);
  }

  removeIpField(index: number): void {
    this.ips.update(current => {
      if (current.length > 1) {
        return current.filter((_, i) => i !== index);
      }
      return current;
    });
  }

  async detectIp(index: number): Promise<void> {
    this.isDetectingIp.set(true);
    try {
      const response: any = await firstValueFrom(this.http.get('https://api.ipify.org?format=json'));
      if (response && response.ip) {
        this.ips.update(current => {
          const updated = [...current];
          updated[index].ip = response.ip;
          if (!updated[index].label) updated[index].label = 'Auto-Detected IP';
          return updated;
        });
        this.toastService.success('IP Detected', `Detected IP: ${response.ip}`);
      }
    } catch (err) {
      this.toastService.error('Detection Failed', 'Could not detect public IP automatically.');
    } finally {
      this.isDetectingIp.set(false);
    }
  }

  detectLocation(): void {
    if (!navigator.geolocation) {
      this.toastService.error('Error', 'Geolocation is not supported by your browser.');
      return;
    }
    this.isDetectingLocation.set(true);

    const onSuccess = (position: GeolocationPosition) => {
      this.formLat = position.coords.latitude;
      this.formLng = position.coords.longitude;
      this.isDetectingLocation.set(false);
      this.toastService.success('Location Detected', 'Coordinates updated successfully.');
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        // Fallback to standard accuracy
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (error) => {
            this.isDetectingLocation.set(false);
            this.toastService.error('Location Error', error.message || 'Failed to detect location.');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  onSubmit(): void {
    if (!this.formName.trim() || !this.formCode.trim() || this.formBranchId === null) {
      this.toastService.error('Validation Error', 'Branch ID, Name, and Code are required.');
      return;
    }

    const filledIps = this.ips().filter(ip => ip.ip.trim() !== '').map(ip => ip.ip.trim());
    const seenIps = new Set<string>();
    for (const ip of filledIps) {
      if (seenIps.has(ip)) {
        this.toastService.error('Validation Error', `Duplicate IP address '${ip}' is not allowed in allowed IPs.`);
        return;
      }
      seenIps.add(ip);
    }

    const payload = {
      branch_id: this.formBranchId,
      name: this.formName.trim().toUpperCase(),
      code: this.formCode.trim().toUpperCase(),
      phone: this.formPhone.trim(),
      email: this.formEmail.trim(),
      address: this.formAddress.trim(),
      latitude: this.formLat,
      longitude: this.formLng,
      geofence_radius_meters: this.formRadius,
      ip_validation_enabled: this.formIpValidation,
      location_validation_enabled: this.formLocationValidation,
      is_active: true,
      allowed_ips: this.ips().filter(ip => ip.ip.trim() !== '').map(ip => ({
        ip_address: ip.ip.trim(),
        label: ip.label.trim() || 'Allowed IP'
      }))
    };

    const handleApiError = (err: any) => {
      this.isSubmitting.set(false);
      let errorMsg = 'Server error occurred.';
      if (err?.error?.message) {
        errorMsg = err.error.message;
      } else if (err?.error?.errors) {
        const errObj = err.error.errors;
        if (typeof errObj === 'string') {
          errorMsg = errObj;
        } else if (typeof errObj === 'object') {
          const firstKey = Object.keys(errObj)[0];
          const val = errObj[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : String(val);
        }
      }
      this.toastService.error('API Error', errorMsg);
    };

    this.isSubmitting.set(true);

    if (this.editBranch) {
      this.branchUpdateService.putData(this.editBranch.id, payload).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          if (res.status === 'success') {
            this.toastService.success('Branch Updated', res.message || 'Branch updated successfully.');
            this.branchAdded.emit();
            this.close();
          } else {
            this.toastService.error('Error', res.message || 'Failed to update branch.');
          }
        },
        error: handleApiError
      });
    } else {
      this.branchCreateService.postData(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          if (res.status === 'success') {
            this.toastService.success('Branch Added', res.message || 'Branch created successfully.');
            this.branchAdded.emit();
            this.close();
          } else {
            this.toastService.error('Error', res.message || 'Failed to create branch.');
          }
        },
        error: handleApiError
      });
    }
  }

  close(): void {
    this.closeModal.emit();
  }
}
