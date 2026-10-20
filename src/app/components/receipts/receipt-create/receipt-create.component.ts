import { Component, inject, signal, computed, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { AuthService } from '../../../services/auth.service';
import { BranchListService } from '../../../services/branch-list.service';
import { UserListService } from '../../../services/user-list.service';

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
  private userListService = inject(UserListService);

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
  isPR = signal<boolean>(false);
  isOT = signal<boolean>(false);
  receiptId = signal<string>('');
  canEditReceiptId = computed(() => this.isAdmin() || this.isOT());

  // Branch User Selection (for Admin)
  branchUsers = signal<any[]>([]);
  isLoadingUsers = signal<boolean>(false);
  selectedUserId = signal<string>('');
  selectedUserName = signal<string>('');
  selectedUserDisplayName = signal<string>('');
  isUserDropdownOpen = signal<boolean>(false);
  userSearch = signal<string>('');

  isBranchDropdownOpen = signal<boolean>(false);
  branchSearch = signal<string>('');

  isSuperintendent = signal<boolean>(false);
  donationType = signal<string>('Amount'); // Options: 'Amount', 'Goodies'

  filteredBranches = computed(() => {
    const q = this.branchSearch().toLowerCase();
    if (!q) return this.branches();
    return this.branches().filter(b => (b.name || '').toLowerCase().includes(q));
  });

  filteredBranchUsers = computed(() => {
    const q = this.userSearch().toLowerCase().trim();
    if (!q) return this.branchUsers();
    return this.branchUsers().filter((u: any) =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.employee_Id || '').toLowerCase().includes(q) ||
      (u.designation || '').toLowerCase().includes(q)
    );
  });

  isCurrentBranchTrust = computed(() => {
    if (this.isPR()) return true;
    const currentBranchId = this.branch();
    if (!currentBranchId) return false;
    const b = this.branches().find(br => String(br.id) === String(currentBranchId));
    return b ? b.is_trust === true : false;
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
    if (this.authService.hasRole(['SUPERINTENDENT'])) {
      this.isSuperintendent.set(true);
    }
    if (this.authService.hasRole(['ADMIN', 'ADMINISTRATOR'])) {
      this.isAdmin.set(true);
      this.fetchBranches();
    } else if (this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM'])) {
      this.isOT.set(true);
      this.fetchBranches();
    } else if (this.authService.hasRole(['PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER', 'PR'])) {
      this.isPR.set(true);
      this.fetchBranches();
    } else if (!this.isSuperintendent()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.fetchPaymentModes();
  }

  fetchBranches() {
    this.branchService.getData(1, 1000, '', 'true').subscribe({
      next: (res: any) => {
        let branchData = [];
        if (res && res.results) {
          branchData = res.results;
        } else if (res && res.data) {
          branchData = res.data;
        } else if (Array.isArray(res)) {
          branchData = res;
        }

        if (this.isPR()) {
          // Public Relations Officer: only trust branches
          branchData = branchData.filter((b: any) => b.is_trust === true);
          
          const userBranchId = this.authService.currentUser()?.branch?.id;
          if (userBranchId) {
            const assigned = branchData.find((b: any) => b.id === userBranchId);
            if (assigned) {
              this.selectBranch(assigned);
            }
          }
        }
        
        this.branches.set(branchData);

        // Auto-select if there is only one branch available or not selected yet
        if (!this.branch() && branchData.length === 1) {
          this.selectBranch(branchData[0]);
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

  matchedDonors = signal<any[]>([]);

  onMobileNumberChange(val: string): void {
    val = (val || '').replace(/[^0-9]/g, '').slice(0, 10);
    this.mobileNumber.set(val);
    this.matchedDonors.set([]); // Reset on change
    
    if (val && val.length === 10) {
      this.paymentService.checkVerifiedDonor(val).subscribe({
        next: (res: any[]) => {
          if (res && res.length > 0) {
            this.matchedDonors.set(res);
            this.donorType.set('OLD');
            if (res.length === 1 && res[0].name) {
              this.selectMatchedDonor(res[0]);
            } else {
              this.donorName.set('');
              this.panNumber.set('');
            }
          } else {
            this.donorType.set('NEW');
            this.matchedDonors.set([]);
          }
        },
        error: (err: any) => {
          this.donorType.set('NEW');
          this.matchedDonors.set([]);
        }
      });
    } else {
      this.donorType.set('NEW');
      this.matchedDonors.set([]);
    }
  }

  onAltMobileNumberChange(val: string): void {
    this.altMobileNumber.set(val || '');
  }

  selectMatchedDonor(donorOrValue: any): void {
    if (donorOrValue === 'new') {
      this.donorName.set('');
      this.panNumber.set('');
      this.donorType.set('OLD');
    } else if (donorOrValue) {
      this.donorName.set(donorOrValue.name);
      this.panNumber.set(donorOrValue.pan_number || '');
      this.donorType.set('OLD');
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
    this.donationType.set('Amount');
    this.branchSearch.set('');
    this.branchName.set('');
    this.selectedUserId.set('');
    this.selectedUserName.set('');
    this.selectedUserDisplayName.set('');
    this.branchUsers.set([]);
    this.userSearch.set('');
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

    if (this.isAdmin()) {
      this.slab.set('1');
      this.fetchBranchUsers(b);
    }
  }

  toggleUserDropdown() {
    if (!this.branch()) return;
    this.isUserDropdownOpen.update(v => !v);
  }

  selectUser(u: any) {
    this.selectedUserId.set(String(u.id));
    this.selectedUserName.set(u.full_name || u.employee_Id);
    const roleLabel = u.designation || this.getUserRoleLabel(u);
    this.selectedUserDisplayName.set(`${u.full_name || u.employee_Id} (${u.employee_Id}) - ${roleLabel}`);
    this.isUserDropdownOpen.set(false);
    this.userSearch.set('');

    // If branch is non-trust, set slab to the selected user's slab!
    if (!this.isCurrentBranchTrust()) {
      this.slab.set(u.slab || '1');
    } else {
      this.slab.set('1');
    }
  }

  getUserRoleLabel(u: any): string {
    const roles = (u.roles || []).map((r: any) => (typeof r === 'string' ? r : r.name || r.code || ''));
    return roles.join(', ') || 'Staff';
  }

  filterUsersByBranchType(users: any[], isTrust: boolean): any[] {
    return users.filter((u: any) => {
      if (u.is_active === false || String(u.status || '').toLowerCase() === 'inactive') {
        return false;
      }

      const roles: string[] = (u.roles || []).map((r: any) =>
        ((typeof r === 'string' ? r : r.code || r.name) || '').toUpperCase().trim()
      );
      const designation: string = (u.designation || '').toUpperCase().trim();

      if (isTrust) {
        // Trust branch -> only PUBLIC RELATIONSHIP OFFICER
        return roles.some(r =>
          r === 'PUBLIC_RELATIONS' ||
          r === 'PUBLIC RELATIONSHIP OFFICER' ||
          r === 'PR' ||
          r.includes('PUBLIC')
        ) || designation.includes('PUBLIC RELATION') || designation === 'PR' || designation === 'PRO';
      } else {
        // Non-trust branch -> only Team Leader and Telecaller
        return roles.some(r =>
          r === 'TL' ||
          r === 'TC' ||
          r === 'TEAM LEADER' ||
          r === 'TEAM LEAD' ||
          r === "TL'S" ||
          r === 'TELECALLER' ||
          r === 'TELE CALLER'
        ) || designation.includes('LEADER') || designation.includes('TELECALLER') || designation === 'TL' || designation === 'TC';
      }
    });
  }

  fetchBranchUsers(branchObj: any) {
    this.isLoadingUsers.set(true);
    this.branchUsers.set([]);
    this.selectedUserId.set('');
    this.selectedUserName.set('');
    this.selectedUserDisplayName.set('');

    const branchId = branchObj?.id || branchObj;
    const isTrust = branchObj?.is_trust ?? false;

    this.userListService.getRoleUsers('ALL', branchId, null, null, 1, 1000, '', 'active').subscribe({
      next: (res: any) => {
        let allUsers: any[] = [];
        if (res && res.results) {
          allUsers = res.results;
        } else if (res && res.data) {
          allUsers = res.data;
        } else if (Array.isArray(res)) {
          allUsers = res;
        }

        const eligible = this.filterUsersByBranchType(allUsers, isTrust);
        this.branchUsers.set(eligible);
        this.isLoadingUsers.set(false);

        if (eligible.length === 1) {
          this.selectUser(eligible[0]);
        }
      },
      error: (err: any) => {
        console.error('Error fetching branch users:', err);
        this.isLoadingUsers.set(false);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.branch-dropdown-container')) {
      this.isBranchDropdownOpen.set(false);
    }
    if (!target.closest('.user-dropdown-container')) {
      this.isUserDropdownOpen.set(false);
    }
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if ((this.isAdmin() || this.isPR()) && !this.branch()) {
      this.errorMessage.set('Branch selection is required.');
      return;
    }

    if (this.isAdmin() && !this.selectedUserId()) {
      this.errorMessage.set('Please select an active staff member for this branch.');
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
    
    if (this.donationType() === 'Goodies') {
      // Amount, referenceId, and modeOfPayment are not required for Goodies
    } else {
      const amtStr = this.amount() !== null && this.amount() !== undefined ? String(this.amount()).trim() : '';
      if (amtStr === '' || isNaN(Number(amtStr)) || Number(amtStr) < 0) {
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
    }
    if (!this.donorType().trim()) {
      this.errorMessage.set('Donor Type is required.');
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
    if (this.canEditReceiptId() && this.receiptId().trim()) {
      formData.append('receipt_id', this.receiptId().trim());
    }
    formData.append('mobile_number', this.mobileNumber().trim());
    if (this.altMobileNumber().trim()) {
      formData.append('alt_mobile_number', this.altMobileNumber().trim());
    }
    formData.append('donor_name', this.donorName().trim().toUpperCase());
    
    if (this.donationType() === 'Goodies') {
      formData.append('amount', '0');
      formData.append('reference_id', 'Goodies');
      formData.append('mode_of_payment', 'Goodies');
      formData.append('donation_type', 'Goodies');
    } else {
      formData.append('amount', String(this.amount() ?? '').trim());
      formData.append('reference_id', this.referenceId().trim());
      formData.append('mode_of_payment', this.modeOfPayment().trim().toUpperCase());
      formData.append('donation_type', 'Amount');
    }
    formData.append('slab', this.slab().trim() || '1');
    formData.append('donor_type', this.donorType());

    if ((this.isAdmin() || this.isPR()) && this.branch()) {
      formData.append('branch', this.branch());
    }

    if (this.isAdmin() && this.selectedUserId()) {
      formData.append('telecaller', this.selectedUserId());
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
          const selectedBranchObj = this.branches().find(b => String(b.id) === String(this.branch()));
          if (this.isPR() || (selectedBranchObj && selectedBranchObj.is_trust)) {
            this.router.navigate(['/receipts/trust-receipts']);
          } else {
            this.router.navigate(['/receipts/view']);
          }
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

  goBack(): void {
    if (this.isPR()) {
      this.router.navigate(['/receipts/trust-receipts']);
    } else {
      this.router.navigate(['/receipts/view']);
    }
  }
}
