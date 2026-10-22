import { Component, EventEmitter, Output, Input, inject, signal, computed, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { BranchListService } from '../../services/branch-list.service';
import { UserListService } from '../../services/user-list.service';
import { OnlinePaymentRecord } from '../../models/payment.model';

@Component({
  selector: 'app-add-online-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-online-payment-modal.component.html',
  styleUrl: './add-online-payment-modal.component.css'
})
export class AddOnlinePaymentModalComponent implements OnChanges, OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private branchListService = inject(BranchListService);
  private userListService = inject(UserListService);

  @Input() editRecord: OnlinePaymentRecord | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  // Form Fields
  paymentDate = signal<string>('');
  receiptId = signal<string>('');
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

  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string>('');
  
  existingProofUrl = signal<string | null>(null);
  isProofReplaced = signal<boolean>(false);

  selectedReceiptFile = signal<File | null>(null);
  selectedReceiptFileName = signal<string>('');
  existingReceiptUrl = signal<string | null>(null);
  isReceiptReplaced = signal<boolean>(false);
  isReceiptCleared = signal<boolean>(false);

  paymentModes = signal<any[]>([]);

  isAdmin = signal<boolean>(false);
  isOT = signal<boolean>(false);
  canEditReceiptId = computed(() => this.isAdmin() || this.isOT());
  canChangeStatus = computed(() => this.isAdmin() || this.isOT());

  // Admin Branch & Telecaller Management
  branches = signal<any[]>([]);
  selectedBranchId = signal<number | null>(null);
  branchUsers = signal<any[]>([]);
  selectedUserId = signal<number | null>(null);
  userSearchQuery = signal<string>('');
  isLoadingUsers = signal<boolean>(false);

  filteredBranchUsers = computed(() => {
    const query = this.userSearchQuery().toLowerCase().trim();
    const users = this.branchUsers();
    if (!query) return users;

    const selectedId = this.selectedUserId();
    const matches = users.filter((u: any) => {
      const name = (u.full_name || u.name || '').toLowerCase();
      const empId = (u.employee_Id || '').toLowerCase();
      const phone = (u.phone || u.office_phone || '').toLowerCase();
      return name.includes(query) || empId.includes(query) || phone.includes(query);
    });

    if (selectedId && !matches.some((u: any) => u.id === selectedId)) {
      const selectedUser = users.find((u: any) => u.id === selectedId);
      if (selectedUser) {
        return [selectedUser, ...matches];
      }
    }

    return matches;
  });

  status = signal<string>('OK');
  customStatus = signal<string>('');

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  constructor() {
    const user = this.authService.currentUser();
    if (user && (user as any).slab) {
      this.slab.set((user as any).slab);
    }
    this.checkRoles();
  }

  ngOnInit() {
    this.checkRoles();
    this.fetchPaymentModes();
    if (this.isAdmin()) {
      this.loadBranches();
    }
  }

  checkRoles(): void {
    this.isAdmin.set(this.authService.hasRole(['ADMIN', 'ADMINISTRATOR']));
    this.isOT.set(this.authService.hasRole(['OT', 'ONLINE PAYMENT TEAM']));
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

  getRecordBranchId(): number | null {
    if (!this.editRecord) return null;
    const b = (this.editRecord as any).branch;
    if (b && typeof b === 'object') {
      return b.id ? Number(b.id) : null;
    }
    if (b !== undefined && b !== null && b !== '') {
      const num = Number(b);
      return isNaN(num) ? null : num;
    }
    if ((this.editRecord as any).branch_id !== undefined && (this.editRecord as any).branch_id !== null) {
      const num = Number((this.editRecord as any).branch_id);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  getRecordUserId(): number | null {
    if (!this.editRecord) return null;
    const t = (this.editRecord as any).telecaller;
    if (t && typeof t === 'object') {
      return t.id ? Number(t.id) : null;
    }
    if (t !== undefined && t !== null && t !== '') {
      const num = Number(t);
      return isNaN(num) ? null : num;
    }
    if ((this.editRecord as any).telecaller_id !== undefined && (this.editRecord as any).telecaller_id !== null) {
      const num = Number((this.editRecord as any).telecaller_id);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  loadBranches(): void {
    if (!this.isAdmin()) return;
    this.branchListService.getData(1, 1000, '', 'true').subscribe({
      next: (res: any) => {
        const list = res?.data || res?.results || (Array.isArray(res) ? res : []);
        const recBranchId = this.getRecordBranchId();
        if (recBranchId && !list.some((b: any) => b.id === recBranchId) && this.editRecord) {
          const branchName = (this.editRecord as any).branch_name || `Branch #${recBranchId}`;
          this.branches.set([{ id: recBranchId, name: branchName, is_active: false }, ...list]);
        } else {
          this.branches.set(list);
        }
      },
      error: (err: any) => console.error('Error fetching branches:', err)
    });
  }

  loadBranchUsers(branchId: number, currentUserId?: number | null): void {
    this.isLoadingUsers.set(true);
    this.userListService.getActiveBranchUsers(branchId).subscribe({
      next: (res: any) => {
        this.isLoadingUsers.set(false);
        const users = res?.results || res?.data || (Array.isArray(res) ? res : []);
        if (currentUserId && !users.some((u: any) => u.id === currentUserId) && this.editRecord) {
          const currentUserName = (this.editRecord as any).telecaller_name || `User #${currentUserId}`;
          const currentUserEmpId = (this.editRecord as any).telecaller_employee_Id || '';
          users.unshift({
            id: currentUserId,
            full_name: currentUserName,
            employee_Id: currentUserEmpId,
            is_current: true
          });
        }
        this.branchUsers.set(users);
      },
      error: (err: any) => {
        this.isLoadingUsers.set(false);
        console.error('Error loading branch users:', err);
        this.branchUsers.set([]);
      }
    });
  }

  onBranchChange(val: any): void {
    const bId = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    this.selectedBranchId.set(bId);
    this.selectedUserId.set(null);
    this.userSearchQuery.set('');
    if (bId) {
      this.loadBranchUsers(bId);
    } else {
      this.branchUsers.set([]);
    }
  }

  onUserChange(val: any): void {
    const uId = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    this.selectedUserId.set(uId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editRecord'] && this.editRecord) {
      this.paymentDate.set(this.editRecord.payment_date || '');
      this.receiptId.set(this.editRecord.receipt_id || '');
      this.mobileNumber.set(this.editRecord.mobile_number || '');
      this.altMobileNumber.set(this.editRecord.alt_mobile_number || '');
      this.donorName.set(this.editRecord.donor_name || '');
      this.amount.set(this.editRecord.amount !== undefined && this.editRecord.amount !== null ? String(this.editRecord.amount) : '');
      this.referenceId.set(this.editRecord.reference_id || '');
      this.modeOfPayment.set(this.editRecord.mode_of_payment || '');
      this.slab.set(this.editRecord.slab || '1');
      this.donorType.set(this.editRecord.donor_type || 'NEW');
      this.panNumber.set(this.editRecord.pan_number || '');
      this.correctionName.set(this.editRecord.correction_name || '');
      this.address.set(this.editRecord.address || '');
      this.dob.set(this.editRecord.dob || '');
      this.remarks.set(this.editRecord.remarks || '');
      const curStatus = this.editRecord.status || 'OK';
      this.status.set(curStatus);
      if (!['OK', 'RESEND', 'PENDING', 'NOT OK', 'INVALID'].includes(curStatus)) {
        this.customStatus.set(curStatus);
      } else {
        this.customStatus.set('');
      }
      this.existingProofUrl.set((this.editRecord as any).payment_proof_url || (this.editRecord as any).payment_proof || null);
      this.isProofReplaced.set(false);

      const rUrl = (this.editRecord as any).generated_receipt_url || (this.editRecord as any).generated_receipt || null;
      this.existingReceiptUrl.set(rUrl);
      this.isReceiptReplaced.set(false);
      this.isReceiptCleared.set(false);
      this.selectedReceiptFile.set(null);
      this.selectedReceiptFileName.set('');

      if (this.isAdmin()) {
        const bId = this.getRecordBranchId();
        const uId = this.getRecordUserId();
        this.selectedBranchId.set(bId);
        this.selectedUserId.set(uId);
        this.userSearchQuery.set('');
        if (bId) {
          this.loadBranchUsers(bId, uId);
        } else {
          this.branchUsers.set([]);
        }
        if (this.branches().length === 0) {
          this.loadBranches();
        }
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  onReceiptFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedReceiptFile.set(file);
      this.selectedReceiptFileName.set(file.name);
      this.isReceiptCleared.set(false);
    }
  }

  replaceReceipt(): void {
    this.isReceiptReplaced.set(true);
    this.isReceiptCleared.set(false);
    this.selectedReceiptFile.set(null);
    this.selectedReceiptFileName.set('');
  }

  clearReceipt(): void {
    this.isReceiptCleared.set(true);
    this.isReceiptReplaced.set(false);
    this.selectedReceiptFile.set(null);
    this.selectedReceiptFileName.set('');
  }

  undoClearReceipt(): void {
    this.isReceiptCleared.set(false);
    this.isReceiptReplaced.set(false);
    this.selectedReceiptFile.set(null);
    this.selectedReceiptFileName.set('');
  }

  removeSelectedReceiptFile(): void {
    this.selectedReceiptFile.set(null);
    this.selectedReceiptFileName.set('');
  }

  removeExistingProof(): void {
    this.isProofReplaced.set(true);
    this.selectedFile.set(null);
    this.selectedFileName.set('');
  }

  matchedDonors = signal<any[]>([]);

  onDonorNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const maxLen = this.editRecord ? 20 : 10;
      input.value = (input.value || '').replace(/[^0-9]/g, '').slice(0, maxLen);
    }
  }

  onMobileNumberChange(val: string): void {
    const maxLen = this.editRecord ? 20 : 10;
    val = (val || '').replace(/[^0-9]/g, '').slice(0, maxLen);
    this.mobileNumber.set(val);
    this.matchedDonors.set([]); // Reset on change
    
    if (val && val.length === 10) {
      this.paymentService.checkVerifiedDonor(val).subscribe({
        next: (res: any[]) => {
          if (res && res.length > 0) {
            this.matchedDonors.set(res);
            this.donorType.set('OLD');
            // If there's exactly one match, directly show that name in Donor Name
            if (res.length === 1 && res[0].name) {
              this.selectMatchedDonor(res[0]);
            } else {
              // If multiple matches, user must first select from dropdown
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
      setTimeout(() => {
        document.getElementById('donorName')?.focus();
      }, 0);
    } else if (donorOrValue) {
      this.donorName.set(donorOrValue.name);
      this.panNumber.set(donorOrValue.pan_number || '');
      this.donorType.set('OLD');
    }
  }

  onStatusChange(val: string): void {
    this.status.set(val);
    if (val !== 'CUSTOM') {
      this.customStatus.set('');
    }
  }

  onReset(): void {
    this.paymentDate.set(this.editRecord ? (this.editRecord.payment_date || '') : '');
    this.receiptId.set(this.editRecord ? (this.editRecord.receipt_id || '') : '');
    const defaultStatus = this.editRecord ? (this.editRecord.status || 'OK') : 'OK';
    this.status.set(defaultStatus);
    if (!['OK', 'RESEND', 'PENDING', 'NOT OK', 'INVALID'].includes(defaultStatus)) {
      this.customStatus.set(defaultStatus);
    } else {
      this.customStatus.set('');
    }
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
    this.selectedFile.set(null);
    this.selectedFileName.set('');
    this.isProofReplaced.set(false);
    const rUrl = (this.editRecord as any)?.generated_receipt_url || (this.editRecord as any)?.generated_receipt || null;
    this.existingReceiptUrl.set(rUrl);
    this.selectedReceiptFile.set(null);
    this.selectedReceiptFileName.set('');
    this.isReceiptReplaced.set(false);
    this.isReceiptCleared.set(false);
    this.errorMessage.set('');

    if (this.isAdmin() && this.editRecord) {
      const bId = this.getRecordBranchId();
      const uId = this.getRecordUserId();
      this.selectedBranchId.set(bId);
      this.selectedUserId.set(uId);
      this.userSearchQuery.set('');
      if (bId) {
        this.loadBranchUsers(bId, uId);
      } else {
        this.branchUsers.set([]);
      }
    } else {
      this.selectedBranchId.set(null);
      this.selectedUserId.set(null);
      this.branchUsers.set([]);
      this.userSearchQuery.set('');
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    this.errorMessage.set('');

    const pDate = this.paymentDate() ? this.paymentDate().trim() : '';
    if (!pDate) {
      this.errorMessage.set('Payment Date is required. Please select a valid payment date.');
      return;
    }
    const donorNo = this.mobileNumber().trim();
    if (this.editRecord) {
      if (!donorNo) {
        this.errorMessage.set('Donor Number is required.');
        return;
      }
      if (!/^\d{10,20}$/.test(donorNo)) {
        this.errorMessage.set('Donor Number must be between 10 and 20 digits.');
        return;
      }
    } else {
      if (!/^\d{10}$/.test(donorNo)) {
        this.errorMessage.set('Donor Number must be exactly 10 digits.');
        return;
      }
    }
    if (!this.donorName().trim()) {
      this.errorMessage.set('Donor Name is required.');
      return;
    }
    if (this.editRecord?.donation_type === 'Goodies') {
      // Skip amount, reference_id, and mode_of_payment validation
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

    if (this.isAdmin() && this.editRecord) {
      if (!this.selectedBranchId()) {
        this.errorMessage.set('Branch is required.');
        return;
      }
      if (!this.selectedUserId()) {
        this.errorMessage.set('Assigned User / Telecaller is required.');
        return;
      }
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    formData.append('payment_date', pDate);
    if (this.canEditReceiptId()) {
      const rId = this.receiptId().trim();
      if (rId) {
        formData.append('receipt_id', rId);
      } else if (this.editRecord) {
        formData.append('receipt_id', '');
      }

      if (this.isReceiptCleared() && !this.selectedReceiptFile()) {
        formData.append('clear_receipt', 'true');
      } else if (this.selectedReceiptFile()) {
        formData.append('generated_receipt', this.selectedReceiptFile()!, this.selectedReceiptFile()!.name);
      }
    }

    if (this.canChangeStatus()) {
      const finalStatus = (this.status() === 'CUSTOM' ? this.customStatus() : this.status()).trim().toUpperCase();
      if (finalStatus) {
        formData.append('status', finalStatus);
      }
    }

    if (this.isAdmin() && this.editRecord) {
      if (this.selectedBranchId()) {
        formData.append('branch', String(this.selectedBranchId()));
      }
      if (this.selectedUserId()) {
        formData.append('telecaller', String(this.selectedUserId()));
      }
    }
    formData.append('mobile_number', this.mobileNumber().trim());
    formData.append('alt_mobile_number', this.altMobileNumber().trim());
    formData.append('donor_name', this.donorName().trim().toUpperCase());
    
    if (this.editRecord?.donation_type === 'Goodies') {
      formData.append('amount', '0');
      formData.append('reference_id', 'Goodies');
      formData.append('mode_of_payment', 'Goodies');
    } else {
      formData.append('amount', String(this.amount() ?? '').trim());
      formData.append('reference_id', this.referenceId().trim());
      formData.append('mode_of_payment', this.modeOfPayment().trim().toUpperCase());
    }
    
    formData.append('slab', this.slab().trim() || '1');
    formData.append('donor_type', this.donorType());

    formData.append('pan_number', this.panNumber().trim().toUpperCase());
    formData.append('correction_name', this.correctionName().trim().toUpperCase());
    formData.append('address', this.address().trim().toUpperCase());
    if (this.dob()) {
      formData.append('dob', this.dob());
    }
    formData.append('remarks', this.remarks().trim().toUpperCase());
    if (this.selectedFile()) {
      formData.append('payment_proof', this.selectedFile()!, this.selectedFile()!.name);
    }

    if (this.editRecord) {
      const isReceipt = (this.editRecord.status || '').toUpperCase().startsWith('OK') || !!(this.editRecord as any).generated_receipt || !!this.editRecord.receipt_id;
      const updateObs = isReceipt 
        ? this.paymentService.updateReceipt(this.editRecord.id, formData)
        : this.paymentService.updateOnlinePayment(this.editRecord.id, formData);

      updateObs.subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          this.submitted.emit();
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || err.error?.errors?.reference_id?.[0] || 'Failed to update online payment details.');
          console.error('Error updating online payment:', err);
        }
      });
    } else {
      this.paymentService.createOnlinePayment(formData).subscribe({
        next: (res: any) => {
          this.isSubmitting.set(false);
          this.submitted.emit();
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
}
