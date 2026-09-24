import { Component, inject, signal, computed, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { AuthService } from '../../../services/auth.service';
import { BranchListService } from '../../../services/branch-list.service';

@Component({
  selector: 'app-receipt-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receipt-create.component.html',
  styleUrl: './receipt-create.component.css'
})
export class ReceiptCreateComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private branchService = inject(BranchListService);

  // Form Fields
  paymentDate = signal<string>(new Date().toISOString().slice(0, 10));
  mobileNumber = signal<string>('');
  altMobileNumber = signal<string>('');
  donorName = signal<string>('');
  amount = signal<string>('');
  referenceId = signal<string>('');
  modeOfPayment = signal<string>('');
  slab = signal<string>('1');
  donorType = signal<string>('NEW');
  panNumber = signal<string>('');
  correctionName = signal<string>('');
  address = signal<string>('');
  dob = signal<string>('');
  remarks = signal<string>('');
  branch = signal<string>('');
  branchName = signal<string>('');
  branches = signal<any[]>([]);
  isAdmin = signal<boolean>(false);

  isBranchDropdownOpen = signal<boolean>(false);
  branchSearch = signal<string>('');

  filteredBranches = computed(() => {
    const q = this.branchSearch().toLowerCase();
    if (!q) return this.branches();
    return this.branches().filter(b => (b.name || '').toLowerCase().includes(q));
  });

  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string>('');

  paymentModes = signal<any[]>([]);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  constructor() {
    const user = this.authService.currentUser();
    if (user && (user as any).slab) {
      this.slab.set((user as any).slab);
    }
  }

  ngOnInit() {
    const roles = this.authService.userRoles();
    if (roles.includes('ADMIN')) {
      this.isAdmin.set(true);
      this.fetchBranches();
    }
    this.fetchPaymentModes();
  }

  fetchBranches() {
    this.branchService.getData(1, 100, '', 'true').subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.branches.set(res.results);
        } else if (res && res.data) {
          this.branches.set(res.data);
        } else if (Array.isArray(res)) {
          this.branches.set(res);
        }
      },
      error: (err: any) => console.error('Error fetching branches:', err)
    });
  }

  fetchPaymentModes() {
    this.paymentService.getPaymentModes(true).subscribe({
      next: (res: any) => {
        if (res && res.results) {
          this.paymentModes.set(res.results);
        } else if (Array.isArray(res)) {
          this.paymentModes.set(res);
        }
      },
      error: (err: any) => console.error('Error fetching payment modes:', err)
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  onMobileNumberChange(val: string): void {
    this.mobileNumber.set(val);
    if (val && val.length === 10) {
      this.paymentService.checkVerifiedDonor(val).subscribe({
        next: (res: any) => {
          if (res && res.name) {
            this.donorName.set(res.name);
            this.correctionName.set(res.name);
            this.panNumber.set(res.pan_number || '');
            this.donorType.set('OLD');
          }
        },
        error: (err: any) => {
          // Do nothing, skip if not matched
        }
      });
    }
  }

  onReset(): void {
    this.paymentDate.set(new Date().toISOString().slice(0, 10));
    this.mobileNumber.set('');
    this.altMobileNumber.set('');
    this.donorName.set('');
    this.amount.set('');
    this.referenceId.set('');
    this.modeOfPayment.set('');
    
    const user = this.authService.currentUser();
    this.slab.set(user && (user as any).slab ? (user as any).slab : '1');
    
    this.donorType.set('NEW');
    this.panNumber.set('');
    this.correctionName.set('');
    this.address.set('');
    this.dob.set('');
    this.remarks.set('');
    this.branchSearch.set('');
    this.branchName.set('');
    this.selectedFile.set(null);
    this.selectedFileName.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  toggleBranchDropdown() {
    this.isBranchDropdownOpen.update(v => !v);
  }

  selectBranch(b: any) {
    this.branch.set(b.id);
    this.branchName.set(b.name);
    this.isBranchDropdownOpen.set(false);
    this.branchSearch.set('');
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-container')) {
      this.isBranchDropdownOpen.set(false);
    }
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.isAdmin() && !this.branch()) {
      this.errorMessage.set('Branch selection is required.');
      return;
    }

    if (!this.paymentDate()) {
      this.errorMessage.set('Payment Date is required.');
      return;
    }
    const donorNo = this.mobileNumber().trim();
    if (!/^\d{10}$/.test(donorNo)) {
      this.errorMessage.set('Donor Number must be exactly 10 digits.');
      return;
    }
    if (!this.donorName().trim()) {
      this.errorMessage.set('Donor Name is required.');
      return;
    }
    if (!this.amount() || parseFloat(this.amount()) <= 0) {
      this.errorMessage.set('Please enter a valid amount.');
      return;
    }
    if (!this.referenceId().trim()) {
      this.errorMessage.set('Reference Id is required.');
      return;
    }
    if (!this.modeOfPayment().trim()) {
      this.errorMessage.set('Payment Mode is required.');
      return;
    }
    if (!this.donorType().trim()) {
      this.errorMessage.set('Donor Type is required.');
      return;
    }

    const mNo = this.mobileNumber().trim();
    const altNo = this.altMobileNumber().trim();
    if (altNo && mNo === altNo) {
      this.errorMessage.set('Alternate Mobile Number cannot be the same as Donor Number.');
      return;
    }

    const pan = this.panNumber().trim();
    if (pan) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
      if (!panRegex.test(pan)) {
        this.errorMessage.set('Please enter a valid PAN Number format (e.g., ABCDE1234F).');
        return;
      }
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    formData.append('payment_date', this.paymentDate());
    formData.append('mobile_number', this.mobileNumber().trim());
    if (this.altMobileNumber().trim()) {
      formData.append('alt_mobile_number', this.altMobileNumber().trim());
    }
    formData.append('donor_name', this.donorName().trim().toUpperCase());
    formData.append('amount', this.amount());
    formData.append('reference_id', this.referenceId().trim());
    formData.append('mode_of_payment', this.modeOfPayment().trim().toUpperCase());
    formData.append('slab', this.slab().trim() || '1');
    formData.append('donor_type', this.donorType());

    if (this.isAdmin() && this.branch()) {
      formData.append('branch', this.branch());
    }

    if (this.panNumber().trim()) {
      formData.append('pan_number', this.panNumber().trim().toUpperCase());
    }
    if (this.correctionName().trim()) {
      formData.append('correction_name', this.correctionName().trim().toUpperCase());
    }
    if (this.address().trim()) {
      formData.append('address', this.address().trim().toUpperCase());
    }
    if (this.dob()) {
      formData.append('dob', this.dob());
    }
    if (this.remarks().trim()) {
      formData.append('remarks', this.remarks().trim().toUpperCase());
    }
    if (this.selectedFile()) {
      formData.append('payment_proof', this.selectedFile()!, this.selectedFile()!.name);
    }

    this.paymentService.createReceipt(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Receipt created successfully!');
        setTimeout(() => {
          this.router.navigate(['/receipts/view']);
        }, 1500);
      },
      error: (err: any) => {
        console.error('Error submitting online payment:', err);
        this.isSubmitting.set(false);
        const msg = err.error?.message || err.error?.errors?.reference_id?.[0] || 'Failed to submit payment details. Please check all fields.';
        this.errorMessage.set(msg);
      }
    });
  }
}
