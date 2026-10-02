import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FoodBookingService, FoodBooking, FoodMenu } from '../../services/food-booking.service';
import { BranchListService } from '../../services/branch-list.service';
import { Branch } from '../../models/branch.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-food-booking-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './food-booking-calendar.component.html',
  styleUrls: ['./food-booking-calendar.component.css']
})
export class FoodBookingCalendarComponent implements OnInit {
  private foodService = inject(FoodBookingService);
  private branchService = inject(BranchListService);
  private authService = inject(AuthService);

  currentDate = new Date();
  currentMonth = signal(this.currentDate.getMonth() + 1);
  currentYear = signal(this.currentDate.getFullYear());
  branchesList = signal<Branch[]>([]);
  trustBranchesList = computed(() => this.branchesList().filter(b => b.is_trust === true));
  occasionsList = signal<any[]>([]);
  paymentModesList = signal<any[]>([]);
  selectedBranchId = signal<number | null>(null);
  activeTab = signal<'list' | 'calendar' | 'menus'>('list');

  isAdmin = computed(() => {
    return this.authService.userRoles().includes('ADMIN');
  });
  
  isTL = computed(() => {
    return this.authService.userRoles().includes('TL');
  });

  isPR = computed(() => {
    return this.authService.userRoles().includes('PUBLIC_RELATIONS');
  });

  isManager = computed(() => {
    return this.authService.userRoles().includes('MANAGER');
  });

  roleFilterLocked = computed(() => {
    // If TL or PR, they are locked to their own mapped branch (unless they are also a manager)
    return (this.isTL() || this.isPR()) && !this.isManager();
  });
  
  foodMenus = signal<FoodMenu[]>([]);
  bookings = signal<FoodBooking[]>([]);
  allBookings = signal<FoodBooking[]>([]); // For the list view

  selectedDate = signal<any>(null);
  selectedFile: File | null = null;

  getValidDays = computed(() => {
    return this.calendarDays().filter(d => d.date !== null);
  });
  
  menuFilterTrust = signal<number | null>(null);
  menuFilterSlot = signal<string>('');
  menuFilterStatus = signal<string>('');

  branchFilterList = computed(() => {
    if (this.isAdmin()) {
      return this.branchesList();
    }
    if (this.isManager()) {
      const user: any = this.authService.currentUser();
      return user && user.managed_branches ? user.managed_branches : [];
    }
    return this.branchesList();
  });

  filteredFoodMenus = computed(() => {
    let menus = this.foodMenus();
    const trustFilter = this.menuFilterTrust();
    if (trustFilter) {
      menus = menus.filter(m => m.trust_name == trustFilter);
    }
    const slotFilter = this.menuFilterSlot();
    if (slotFilter) {
      menus = menus.filter(m => m.slot === slotFilter);
    }
    const statusFilter = this.menuFilterStatus();
    if (statusFilter === 'active') {
      menus = menus.filter(m => m.is_active === true);
    } else if (statusFilter === 'inactive') {
      menus = menus.filter(m => m.is_active === false);
    }
    return menus;
  });

  resetMenuFilters() {
    this.menuFilterTrust.set(null);
    this.menuFilterSlot.set('');
    this.menuFilterStatus.set('');
  }

  uniqueSlots = computed(() => {
    const menus = this.foodMenus();
    const currentTrustId = this.selectedBranchId();
    const slots = new Set<string>();
    menus.forEach(m => {
      if (m.is_active && m.trust_name == currentTrustId) slots.add(m.slot);
    });
    const ordered = ['BREAKFAST', 'LUNCH', 'DINNER', 'CAKE CUTTING'];
    return ordered.filter(s => slots.has(s));
  });
  
  // List View Filters
  listFilters = {
    trust_name: null as number | null,
    branch_name: null as number | null,
    booking_status: '',
    slot: '',
    booking_date: '',
    search: ''
  };

  listPagination = signal({
    page: 1,
    limit: 10,
    total: 0
  });

  changePage(newPage: number) {
    this.listPagination.update(p => ({ ...p, page: newPage }));
    this.fetchAllBookings();
  }

  get totalPages() {
    return Math.ceil(this.listPagination().total / this.listPagination().limit);
  }

  calendarDays = signal<any[]>([]);

  ngOnInit() {
    this.loadBranches();
    this.loadOccasions();
    this.loadPaymentModes();
  }

  loadBranches() {
    this.branchService.getData(1, 100).subscribe((res: any) => {
      const data: Branch[] = res.data || res.results || res;
      this.branchesList.set(data);
      const user: any = this.authService.currentUser();
      let selected = false;
      const isAdmin = this.authService.userRoles().includes('ADMIN');
      const userBranchId = user && user.branch ? user.branch.id : null;
      
      if (this.roleFilterLocked() && userBranchId && !isAdmin) {
        const b = data.find((br: Branch) => br.id === userBranchId);
        if (b) {
          if (b.is_trust) {
            this.selectedBranchId.set(b.id);
            this.listFilters.trust_name = b.id;
          } else {
            this.listFilters.branch_name = b.id;
            const trusts = data.filter((br: Branch) => br.is_trust === true);
            if (trusts.length > 0) {
              this.selectedBranchId.set(trusts[0].id);
            }
          }
          selected = true;
        }
      }
      
      if (!selected) {
        const trusts = data.filter((b: Branch) => b.is_trust === true);
        if (trusts.length > 0) {
          this.selectedBranchId.set(trusts[0].id);
          // Only default calendar tab; list tab stays null (All)
        }
      }
      
      this.fetchData();
      this.fetchAllBookings();
    });
  }

  onBranchChange() {
    this.listFilters.trust_name = this.selectedBranchId();
    this.fetchData();
    this.fetchAllBookings();
  }

  applyListFilters() {
    this.listPagination.update(p => ({ ...p, page: 1 }));
    this.fetchAllBookings();
  }
  loadOccasions() {
    this.foodService.getOccasions(true).subscribe({
      next: (res: any[]) => {
        // DRF returns paginated results, so extract data from results if present
        const occasions = res.length !== undefined ? res : (res as any).results || [];
        this.occasionsList.set(occasions);
      },
      error: err => console.error("Error loading occasions", err)
    });
  }

  loadPaymentModes() {
    this.foodService.getPaymentModes().subscribe({
      next: (res: any) => {
        const modes = res.length !== undefined ? res : res.results || [];
        this.paymentModesList.set(modes);
      },
      error: err => console.error("Error loading payment modes", err)
    });
  }

  onSearchChange(value: string) {
    this.applyListFilters();
  }

  resetListFilters() {
    const user: any = this.authService.currentUser();
    const isAdmin = this.authService.userRoles().includes('ADMIN');
    
    let defaultTrust = null;
    let defaultBranch = null;
    
    if (this.roleFilterLocked() && !isAdmin) {
       const userBranchId = user && user.branch ? user.branch.id : null;
       if (userBranchId) {
          const b = this.branchesList().find((br: Branch) => br.id === userBranchId);
          if (b) {
             if (b.is_trust) {
                defaultTrust = b.id;
             } else {
                defaultBranch = b.id;
             }
          }
       }
    }
    
    this.listFilters = {
      trust_name: defaultTrust,
      branch_name: defaultBranch,
      booking_status: '',
      slot: '',
      booking_date: '',
      search: ''
    };
    this.applyListFilters();
  }

  fetchAllBookings() {
    const filters = {
      ...this.listFilters,
      page: this.listPagination().page,
      page_size: this.listPagination().limit
    };
    // The backend now has separate `trust_name` and `branch` parameters.
    const actualFilters: any = { ...filters };
    if (this.listFilters.branch_name) {
      actualFilters.branch = this.listFilters.branch_name;
    }
    if (this.listFilters.trust_name) {
      actualFilters.trust_name = this.listFilters.trust_name;
    }
    delete actualFilters.branch_name;

    this.foodService.getFoodBookings(actualFilters).subscribe((res: any) => {
      if (res && res.results) {
        this.allBookings.set(res.results);
        this.listPagination.update(p => ({ ...p, total: res.count }));
      } else {
        const bks = res.data || res;
        this.allBookings.set(Array.isArray(bks) ? bks : []);
        this.listPagination.update(p => ({ ...p, total: Array.isArray(bks) ? bks.length : 0 }));
      }
    });
  }

  exportXLSX() {
    this.foodService.getFoodBookings({ ...this.listFilters, page_size: 10000 }).subscribe((res: any) => {
      const data = res.results || res.data || res;
      if (!data || !data.length) return this.showToast("No data to export", true);
      
      let csv = "ID,Trust Name,Branch ID,Branch Name,Menu,Slot,Booking Date,Occasion,Donor,Mobile,Alternative Mobile,Amount,Paid,Status,Remarks,Payment Details,Attachment URL,Created At\n";
      data.forEach((b: any) => {
        let paymentsInfo = '';
        if (b.payments && b.payments.length > 0) {
           paymentsInfo = b.payments.map((p: any, index: number) => `[P${index+1}: ₹${p.amount_paid} via ${p.mode_of_payment || 'N/A'} on ${p.payment_date || ''} Ref:${p.reference_id || 'N/A'}]`).join(' | ');
        }
        let attachmentUrl = b.attachment ? String(b.attachment) : 'N/A';
        let createdAtStr = b.created_at ? new Date(b.created_at).toLocaleString() : '';
        csv += `${b.id},"${b.trust_name_display}","${b.branch || ''}","${b.branch_display || ''}","${b.menu_name_display}","${b.slot_display}","${b.booking_date}","${b.occasion_name || ''}","${b.donor_name}","${b.mobile_number}","${b.alternative_number || ''}",${b.total_amount},${b.total_paid_amount},"${b.booking_status}","${b.remarks || ''}","${paymentsInfo}","${attachmentUrl}","${createdAtStr}"\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `food_bookings_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  changeMonth(delta: number) {
    let newMonth = this.currentMonth() + delta;
    let newYear = this.currentYear();
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    this.currentMonth.set(newMonth);
    this.currentYear.set(newYear);
    this.fetchData();
  }

  fetchData() {
    const trustId = this.selectedBranchId();

    this.foodService.getFoodMenus().subscribe((res: any) => {
      const data = res.results || res.data || res;
      this.foodMenus.set(Array.isArray(data) ? data : []);
      
      if (trustId) {
        this.foodService.getFoodBookings({
          trust_name: trustId,
          month: this.currentMonth(),
          year: this.currentYear(),
          page_size: 10000
        }).subscribe((res: any) => {
          const bks = res.results || res.data || res;
          this.bookings.set(Array.isArray(bks) ? bks : []);
          this.buildCalendar();
        });
      } else {
        this.bookings.set([]);
        this.calendarDays.set([]);
      }
    });
  }

  buildCalendar() {
    const year = this.currentYear();
    const month = this.currentMonth() - 1; // 0-indexed for Date
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty slots for previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, bookings: [] });
    }
    
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${(month+1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      
      const dayBookings = this.bookings().filter(b => b.booking_date === dateString);
      
      days.push({
        date: d,
        fullDate: dateString,
        bookings: dayBookings,
        isToday: dateString === this.getTodayString()
      });
    }
    
    this.calendarDays.set(days);
    
    // Set selected date
    const validDays = days.filter(d => d.date !== null);
    const todayStr = this.getTodayString();
    const todayDay = validDays.find(d => d.fullDate === todayStr);
    
    if (todayDay) {
      this.selectedDate.set(todayDay);
    } else if (validDays.length > 0) {
      this.selectedDate.set(validDays[0]);
    }
  }

  getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  getMonthName() {
    return new Date(this.currentYear(), this.currentMonth() - 1).toLocaleString('default', { month: 'long' });
  }

  newMenu: any = { id: null, trust_name: null, slot: '', menu_name: '', amount: 0, is_active: true };

  formSuccessMessage = signal<string>('');
  formErrorMessage = signal<string>('');

  showFormMessage(msg: string, isError: boolean = false) {
    if (isError) {
      this.formErrorMessage.set(msg);
      this.formSuccessMessage.set('');
    } else {
      this.formSuccessMessage.set(msg);
      this.formErrorMessage.set('');
    }
    setTimeout(() => {
      this.formErrorMessage.set('');
      this.formSuccessMessage.set('');
    }, 4000);
  }

  editMenu(menu: FoodMenu) {
    this.newMenu = {
      id: menu.id,
      trust_name: menu.trust_name,
      slot: menu.slot,
      menu_name: menu.menu_name,
      amount: menu.amount,
      is_active: menu.is_active
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    const lastTrust = this.newMenu.trust_name;
    this.newMenu = { id: null, trust_name: lastTrust, slot: '', menu_name: '', amount: 0, is_active: true };
  }

  getSlotAggregateStatus(day: any, slot: string) {
    if (!day.date) return null;
    const currentTrustId = this.selectedBranchId();
    const menusForSlot = this.foodMenus().filter(m => m.slot === slot && m.is_active && m.trust_name == currentTrustId);
    const bookingsForSlot = day.bookings.filter((b: any) => menusForSlot.some(m => m.id === b.menu));
    
    if (menusForSlot.length === 0) return 'NONE';
    if (bookingsForSlot.length === 0) return 'OPEN';
    
    if (bookingsForSlot.some((b: any) => b.booking_status === 'BOOKED')) return 'BOOKED';
    return 'RESERVED';
  }

  getMenusForSelectedDate(slot: string) {
    const day = this.selectedDate();
    if (!day || !day.date) return [];
    
    const currentTrustId = this.selectedBranchId();
    return this.foodMenus().filter(m => m.slot === slot && m.is_active && m.trust_name == currentTrustId).map(m => {
       const booking = day.bookings.find((b: any) => b.menu === m.id);
       return {
         ...m,
         booking: booking || null
       };
    });
  }

  showBookingModal = signal(false);
  showViewBookingModal = signal(false);
  viewBookingDetails = signal<any>(null);
  
  bookingForm: any = {
    id: null,
    menu_id: null,
    trust_name: null,
    date: '',
    slot: '',
    donor_name: '',
    mobile_number: '',
    alternative_number: '',
    occasion_name: '',
    total_amount: 0,
    branch: null,
    remarks: '',
    payments: []
  };

  showSlotMenusModal = signal(false);
  selectedSlotGroup = signal<{day: any, slot: string, menus: any[]}|null>(null);

  addPaymentRow() {
    this.bookingForm.payments.push({
       id: null,
       amount_paid: 0,
       mode_of_payment: '',
       payment_date: new Date().toISOString().split('T')[0],
       reference_id: ''
    });
  }

  removePaymentRow(index: number) {
    this.bookingForm.payments.splice(index, 1);
  }

  onSlotGroupClick(day: any, slot: string) {
    if (!day.date) return;
    const currentTrustId = this.selectedBranchId();
    const menusForSlot = this.foodMenus().filter(m => m.slot === slot && m.is_active && m.trust_name == currentTrustId).map(m => {
       const bookings = day.bookings.filter((b: any) => b.menu === m.id);
       return {
         ...m,
         bookings: bookings || []
       };
    });
    
    this.selectedSlotGroup.set({
      day: day,
      slot: slot,
      menus: menusForSlot
    });
    this.showSlotMenusModal.set(true);
  }
  
  closeSlotMenusModal() {
     this.showSlotMenusModal.set(false);
     this.selectedSlotGroup.set(null);
  }

  openBookingFormForMenu(menu: any, day: any) {
    this.showSlotMenusModal.set(false);
    this.bookingForm = {
      id: null,
      menu_id: menu.id,
      trust_name: this.selectedBranchId(),
      date: day.fullDate,
      slot: menu.slot,
      donor_name: '',
      mobile_number: '',
      alternative_number: '',
      occasion_name: '',
      total_amount: menu.amount || 0,
      branch: null,
      remarks: '',
      booking_status: 'RESERVED',
      payments: [{
         id: null,
         amount_paid: menu.amount || 0,
         mode_of_payment: '',
         payment_date: day.fullDate,
         reference_id: ''
      }]
    };
    this.showBookingModal.set(true);
  }

  editBookingFromGroup(booking: any, menu: any) {
    this.showSlotMenusModal.set(false);
    this.bookingForm = {
      id: booking.id,
      menu_id: booking.menu,
      trust_name: booking.trust_name,
      date: booking.booking_date,
      slot: menu.slot,
      donor_name: booking.donor_name,
      mobile_number: booking.mobile_number,
      alternative_number: booking.alternative_number || '',
      occasion_name: booking.occasion_name,
      total_amount: booking.total_amount,
      branch: booking.branch,
      remarks: booking.remarks || '',
      booking_status: booking.booking_status,
      payments: booking.payments ? JSON.parse(JSON.stringify(booking.payments)) : []
    };
    this.showBookingModal.set(true);
  }

  viewBookingFromGroup(booking: any) {
    this.showSlotMenusModal.set(false);
    this.viewBookingDetails.set(booking);
    this.showViewBookingModal.set(true);
  }

  closeBookingModal() {
    this.showBookingModal.set(false);
    this.selectedFile = null;
  }

  closeViewBookingModal() {
    this.showViewBookingModal.set(false);
    this.viewBookingDetails.set(null);
  }

  editBooking() {
    const booking = this.viewBookingDetails();
    if (!booking) return;
    this.bookingForm = {
      id: booking.id,
      menu_id: booking.menu,
      trust_name: booking.trust_name,
      date: booking.booking_date,
      slot: booking.slot_display || booking.slot,
      donor_name: booking.donor_name,
      mobile_number: booking.mobile_number,
      alternative_number: booking.alternative_number || '',
      occasion_name: booking.occasion_name,
      total_amount: booking.total_amount,
      branch: booking.branch,
      remarks: booking.remarks || '',
      booking_status: booking.booking_status,
      payments: booking.payments ? JSON.parse(JSON.stringify(booking.payments)) : []
    };
    this.showViewBookingModal.set(false);
    this.showBookingModal.set(true);
  }

  globalToast = signal<{msg: string, isError: boolean} | null>(null);

  showToast(msg: string, isError: boolean = false) {
    this.globalToast.set({msg, isError});
    setTimeout(() => {
      this.globalToast.set(null);
    }, 3000);
  }

  editBookingDirectly(booking: any) {
    this.bookingForm = {
      id: booking.id,
      menu_id: booking.menu,
      trust_name: booking.trust_name,
      date: booking.booking_date,
      slot: booking.slot_display || booking.slot,
      donor_name: booking.donor_name,
      mobile_number: booking.mobile_number,
      alternative_number: booking.alternative_number || '',
      occasion_name: booking.occasion_name,
      total_amount: booking.total_amount,
      branch: booking.branch,
      remarks: booking.remarks || '',
      booking_status: booking.booking_status,
      payments: booking.payments ? JSON.parse(JSON.stringify(booking.payments)) : []
    };
    this.showBookingModal.set(true);
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  submitBooking() {
    const totalPaid = this.bookingForm.payments.reduce((sum: number, p: any) => sum + p.amount_paid, 0);
    const formData = new FormData();
    formData.append('trust_name', this.bookingForm.trust_name);
    formData.append('menu', this.bookingForm.menu_id);
    formData.append('booking_date', this.bookingForm.date);
    formData.append('donor_name', this.bookingForm.donor_name);
    formData.append('mobile_number', this.bookingForm.mobile_number);
    if (this.bookingForm.alternative_number) formData.append('alternative_number', this.bookingForm.alternative_number);
    formData.append('occasion_name', this.bookingForm.occasion_name);
    formData.append('total_amount', this.bookingForm.total_amount);
    if (this.bookingForm.branch) formData.append('branch', this.bookingForm.branch);
    if (this.bookingForm.remarks) formData.append('remarks', this.bookingForm.remarks);
    formData.append('booking_status', this.bookingForm.booking_status === 'COMPLETED' ? 'COMPLETED' : (totalPaid >= this.bookingForm.total_amount ? 'BOOKED' : 'RESERVED'));
    
    if (this.selectedFile) {
      formData.append('attachment', this.selectedFile);
    }

    if (this.bookingForm.id) {
      this.foodService.updateFoodBooking(this.bookingForm.id, formData).subscribe({
        next: (booking) => {
          const requests: any[] = [];
          this.bookingForm.payments.forEach((payment: any) => {
             const pPayload = {
                booking: this.bookingForm.id,
                mode_of_payment: payment.mode_of_payment,
                amount_paid: payment.amount_paid,
                payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
                reference_id: payment.reference_id || 'CASH'
             };
             if (payment.id) {
                requests.push(this.foodService.updatePayment(payment.id, pPayload));
             } else if (payment.amount_paid > 0) {
                requests.push(this.foodService.addPayment(pPayload));
             }
          });
          
          if (requests.length > 0) {
             forkJoin(requests).subscribe({
                next: () => {
                   this.showToast('Booking and payments updated successfully!');
                   this.closeBookingModal();
                   this.fetchData();
                   this.fetchAllBookings();
                },
                error: (err: any) => {
                   this.showToast('Booking updated, but some payments failed: ' + err.message, true);
                   this.closeBookingModal();
                   this.fetchData();
                   this.fetchAllBookings();
                }
             });
          } else {
             this.showToast('Booking updated successfully!');
             this.closeBookingModal();
             this.fetchData();
             this.fetchAllBookings();
          }
        },
        error: (err) => {
          this.showToast('Failed to update booking: ' + (err.error?.detail || err.message), true);
        }
      });
    } else {
      this.foodService.createFoodBooking(formData).subscribe({
        next: (booking) => {
          const requests: any[] = [];
          this.bookingForm.payments.forEach((payment: any) => {
             if (payment.amount_paid > 0) {
                const pPayload = {
                   booking: booking.id,
                   mode_of_payment: payment.mode_of_payment,
                   amount_paid: payment.amount_paid,
                   payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
                   reference_id: payment.reference_id || 'CASH'
                };
                requests.push(this.foodService.addPayment(pPayload));
             }
          });

          if (requests.length > 0) {
             forkJoin(requests).subscribe({
                next: () => {
                   this.showToast('Booking and payments saved successfully!');
                   this.closeBookingModal();
                   this.fetchData();
                   this.fetchAllBookings();
                },
                error: (err: any) => {
                   this.showToast('Booking saved, but some payments failed: ' + err.message, true);
                   this.closeBookingModal();
                   this.fetchData();
                   this.fetchAllBookings();
                }
             });
          } else {
             this.showToast('Booking saved successfully!');
             this.closeBookingModal();
             this.fetchData();
             this.fetchAllBookings();
          }
        },
      error: (err) => {
        this.showToast('Failed to save booking: ' + (err.error?.detail || err.message || JSON.stringify(err.error)), true);
      }
    });
    }
  }

  deleteBooking(id: number) {
    if (confirm("Are you sure you want to delete this booking completely? This action cannot be undone.")) {
      this.foodService.deleteFoodBooking(id).subscribe({
        next: () => {
           this.showToast("Booking deleted successfully.");
           this.fetchData();
           this.fetchAllBookings();
           this.closeBookingModal();
        },
        error: (err) => this.showToast("Failed to delete booking: " + (err.error?.detail || err.message), true)
      });
    }
  }

  createMenu(event: Event) {
    event.preventDefault();
    if (!this.newMenu.trust_name) {
      this.showToast("Please select a Trust", true);
      return;
    }

    const payload = {
      trust_name: this.newMenu.trust_name,
      slot: this.newMenu.slot,
      menu_name: this.newMenu.menu_name,
      amount: this.newMenu.amount,
      is_active: this.newMenu.is_active
    };

    if (this.newMenu.id) {
      this.foodService.updateFoodMenu(this.newMenu.id, payload).subscribe({
        next: (menu) => {
          this.showFormMessage('Menu updated successfully!');
          const lastTrust = this.newMenu.trust_name;
          this.newMenu = { id: null, trust_name: lastTrust, slot: '', menu_name: '', amount: 0, is_active: true };
          this.fetchData(); // Refresh the lists
        },
        error: (err) => {
          console.error(err);
          this.showFormMessage('Failed to update menu.', true);
        }
      });
    } else {
      this.foodService.createFoodMenu(payload).subscribe({
        next: (menu) => {
          this.showFormMessage('Menu created successfully!');
          const lastTrust = this.newMenu.trust_name;
          this.newMenu = { id: null, trust_name: lastTrust, slot: '', menu_name: '', amount: 0, is_active: true };
          this.fetchData(); // Refresh the lists
        },
        error: (err) => {
          console.error(err);
          this.showFormMessage('Failed to create menu.', true);
        }
      });
    }
  }
}
