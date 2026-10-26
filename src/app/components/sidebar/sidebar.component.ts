import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { AttendanceCheckInService } from '../../services/attendance-checkin.service';
import { DeviceAuthModalService } from '../../services/device-auth-modal.service';

export interface SubMenuItem {
  id: string;
  label: string;
  icon?: string;
  allowedRoles?: string[];
  route?: string;
  submenus?: SubMenuItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeClass?: string;
  category?: string;
  allowedRoles?: string[];
  submenus?: SubMenuItem[];
  route?: string;
}

export interface ActiveMenuEvent {
  id: string;
  label: string;
  parentLabel?: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private checkInService = inject(AttendanceCheckInService);
  private modalService = inject(DeviceAuthModalService);
  private router = inject(Router);

  @Input() set currentUser(val: User | null) {
    this.userSignal.set(val);
  }
  get currentUser(): User | null {
    return this.userSignal() || this.authService.currentUser();
  }

  @Input() isOpenMobile = false;
  @Output() closeMobileDrawer = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() menuSelect = new EventEmitter<ActiveMenuEvent>();
  @Output() collapseChange = new EventEmitter<boolean>();

  private userSignal = signal<User | null>(null);

  get userRoles(): string[] {
    const rawRoles = this.currentUser?.roles || [];
    const extracted = this.authService.extractRoleCodes(rawRoles);
    return extracted.length > 0 ? extracted : this.authService.userRoles();
  }

  get primaryRole(): string {
    const roles = this.userRoles;
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    if (roles.includes('SUPERINTENDENT')) return 'SUPERINTENDENT';
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('OT') || roles.includes('ONLINE PAYMENT TEAM')) return 'OT';
    if (roles.includes('TCT')) return 'TCT';
    if (roles.includes('PUBLIC_RELATIONS') || roles.includes('PUBLIC RELATIONSHIP OFFICER') || roles.includes('PR')) return 'PUBLIC_RELATIONS';
    if (roles.includes('TC')) return 'TC';
    return roles.length > 0 ? roles[0] : '';
  }

  // Sidebar expanded / collapsed state (desktop)
  isCollapsed = signal<boolean>(false);

  // Currently active menu or submenu item ID
  activeMenuId = signal<string>('dashboard');

  // Currently expanded accordion menu IDs
  expandedMenuIds = signal<Set<string>>(new Set());

  // Search filter query
  searchQuery = signal<string>('');

  // All 19 Legacy ERP items with full nested submenus from screenshots
  readonly menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      category: 'Core',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'TC','SUPERINTENDENT','PUBLIC_RELATIONS', 'USER', 'OT', 'TCT'],
      route: '/dashboard',
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: 'campaign',
      category: 'Core',
      allowedRoles: ['ADMIN','TL','TC', 'OT'],
      route: '/announcements',
    },
    {
      id: 'branches',
      label: 'Branches',
      icon: 'domain',
      category: 'Core',
      allowedRoles: ['ADMIN'],
      route: '/branches',
    },
    
    {
      id: 'users',
      label: 'Users',
      icon: 'group',
      category: 'Team',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL'],
      submenus: [
        {
          id: 'all_users',
          label: 'All Users',
          icon: 'manage_accounts',
          allowedRoles: ['ADMIN'],
          route: '/users/all',
        },
        {
          id: 'telecaller',
          label: 'Telecaller',
          icon: 'support_agent',
          allowedRoles: ['ADMIN', 'MANAGER', 'TL'],
          route: '/users/telecaller',
        },
        {
          id: 'team_leader',
          label: 'Team Leader',
          icon: 'supervisor_account',
          allowedRoles: ['ADMIN', 'MANAGER'],
          route: '/users/team-leader',
        },
        {
          id: 'backend',
          label: 'Backend',
          icon: 'computer',
          allowedRoles: ['ADMIN'],
          route: '/users/backend',
        },
        {
          id: 'manager',
          label: 'Manager',
          icon: 'manage_accounts',
          allowedRoles: ['ADMIN'],
          route: '/users/manager',
        },
        {
          id: 'admin',
          label: 'Admin',
          icon: 'admin_panel_settings',
          allowedRoles: ['ADMIN'],
          route: '/users/admin',
        },
        {
          id: 'outreach_team',
          label: 'Outreach Team',
          icon: 'groups',
          allowedRoles: ['ADMIN'],
          submenus: [
            {
              id: 'district_coordinator',
              label: 'District Coordinator',
              icon: 'badge',
              allowedRoles: ['ADMIN'],
              route: '/users/outreach-team/district-coordinator',
            },
            {
              id: 'tuition_teacher',
              label: 'Tuition Teacher',
              icon: 'school',
              allowedRoles: ['ADMIN'],
              route: '/users/outreach-team/tuition-teacher',
            },
          ],
        },
        {
          id: 'user_setting',
          label: 'User Setting',
          icon: 'settings',
          allowedRoles: ['ADMIN'],
          route: '/users/settings',
        }
      ],
    },
    {
      id: 'trust_users',
      label: 'Trust Users',
      icon: 'shield_person',
      category: 'Team',
      allowedRoles: ['ADMIN', 'SUPERINTENDENT'],
      route: '/users/trust-users',
    },
    {
      id: 'attendance',
      label: 'Attendance Details',
      icon: 'event_available',
      category: 'Operations',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'TC', 'SUPERINTENDENT','PUBLIC_RELATIONS', 'OT', 'TCT'],
      route: '/attendance',
    },
    {
      id: 'workstation',
      label: 'Workstation',
      icon: 'work',
      category: 'Operations',
      allowedRoles: ['ADMIN', 'TL', 'TC'],
      route: '/workstation',
    },
    {
      id: 'reference_leads',
      label: 'Reference Leads',
      icon: 'person_add',
      category: 'Operations',
      allowedRoles: ['ADMIN', 'TL', 'TC'],
      route: '/reference-leads',
    },
    {
      id: 'send-records',
      label: 'Send Records',
      icon: 'payments',
      category: 'Operations',
      allowedRoles: ['TC','TL'],
      route: '/send-records',
    },
    {
      id: 'approved-records',
      label: 'Approved Records',
      icon: 'verified',
      category: 'Operations',
      allowedRoles: ['TC'],
      route: '/approved-records',
    },
    {
      id: 'online_history_tc',
      label: 'Payment History',
      icon: 'history_toggle_off',
      category: 'Operations',
      allowedRoles: ['TC'],
      route: '/online-history',
    },
    {
      id: 'approve_assign',
      label: 'Approve/Assign Base',
      icon: 'assignment_ind',
      category: 'Operations',
      allowedRoles: ['ADMIN'],
      route: '/approve-assign',
    },
    {
      id: 'tl_data_management',
      label: 'Branch Data Management',
      icon: 'domain',
      category: 'Operations',
      allowedRoles: ['TL'],
      route: '/tl-data-management',
    },
    {
      id: 'online_status',
      label: 'Payment Batches',
      icon: 'sync_alt',
      category: 'Finance',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'OT', 'ONLINE PAYMENT TEAM'],
      submenus: [
        {
          id: 'live_batch',
          label: 'Live Batch',
          icon: 'speed',
          allowedRoles: ['ADMIN', 'MANAGER', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/live-batch',
        },
        {
          id: 'batch_reports',
          label: 'Batch Details',
          icon: 'receipt_long',
          allowedRoles: ['ADMIN','TL', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/batch-reports',
        },
        {
          id: 'approved_records_admin',
          label: 'Approved Records',
          icon: 'verified',
          allowedRoles: ['ADMIN', 'TL', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/approved-records',
        },
        {
          id: 'online_history',
          label: 'Payment History',
          icon: 'history_toggle_off',
          allowedRoles: ['ADMIN', 'TL', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/online-history',
        },
        {
          id: 'verified_donors',
          label: 'Verified Donors',
          icon: 'how_to_reg',
          allowedRoles: ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/verified-donors',
        },
        {
          id: 'unclaimed_records',
          label: 'Unclaimed Records',
          icon: 'receipt',
          allowedRoles: ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/unclaimed-records',
        },
        {
          id: 'batch_settings',
          label: 'Batch Setting',
          icon: 'settings',
          allowedRoles: ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
          route: '/batch-settings',
        },

      ],
    },
    {
      id: 'whatsapp',
      label: 'Whatsapp',
      icon: 'chat',
      category: 'Communication',
      allowedRoles: ['ADMIN', 'TL', 'TC'],
      submenus: [
        
        {
          id: 'whatsapp_accounts',
          label: 'WhatsApp Accounts',
          icon: 'link',
          allowedRoles: ['ADMIN'],
          route: '/whatsapp-accounts',
        },
        {
          id: 'whatsapp_campaigns',
          label: 'WhatsApp Campaigns',
          icon: 'campaign',
          allowedRoles: ['ADMIN'],
          route: '/whatsapp-campaigns',
        },
        {
          id: 'send_whatsapp_message',
          label: 'Send Message',
          icon: 'send',
          allowedRoles: ['TL', 'TC'],
          route: '/whatsapp-send',
        },
        {
          id: 'whatsapp_receipt_settings',
          label: 'WhatsApp Receipt Settings',
          icon: 'receipt',
          allowedRoles: ['ADMIN'],
          route: '/whatsapp-receipt-settings',
        },
        {
          id: 'whatsapp_send_history',
          label: 'Whatsapp History',
          icon: 'history',
          allowedRoles: ['ADMIN', 'TL', 'TC'],
          route: '/whatsapp-history',
        },
      ],
    },

    {
      id: 'receipts',
      label: 'Receipts',
      icon: 'receipt_long',
      category: 'Finance',
      allowedRoles: ['ADMIN', 'TL', 'TC', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER', 'TCT', 'OT','ONLINE PAYMENT TEAM'],
      submenus: [
        // {
        //   id: 'receipt_create',
        //   label: 'Create Receipt',
        //   icon: 'add_circle',
        //   route: '/receipts/create',
        //   allowedRoles: ['ADMIN', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER'],
        // },
        {
          id: 'receipts_view',
          label: 'Receipt List',
          icon: 'receipt',
          route: '/receipts/view',
          allowedRoles: ['ADMIN', 'TL', 'TC', 'TCT', 'OT', 'ONLINE PAYMENT TEAM'],
        },
        {
          id: 'trust_receipts',
          label: 'Trust Receipts',
          icon: 'verified_user',
          route: '/receipts/trust-receipts',
          allowedRoles: ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER'],
        },
        {
          id: 'batch_receipts',
          label: 'Batch Receipts',
          icon: 'inventory_2',
          route: '/receipts/batch-receipts',
          allowedRoles: ['ADMIN', 'TCT', 'OT', 'ONLINE PAYMENT TEAM'],
        },
      ],
    },

    {
      id: 'branch_details',
      label: 'Branch Details',
      icon: 'location_city',
      category: 'Core',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'PUBLIC_RELATIONS', 'SUPERINTENDENT', 'OT', 'ONLINE PAYMENT TEAM'],
      submenus: [
        {
          id: 'branch_documents',
          label: 'Branch Documents',
          icon: 'folder_shared',
          allowedRoles: ['ADMIN', 'TL', 'PUBLIC_RELATIONS','SUPERINTENDENT'],
          route: '/branch-documents',
        },
        {
          id: 'expense_details',
          label: 'Expense Details',
          icon: 'receipt',
          allowedRoles: ['ADMIN', 'TL', 'PUBLIC_RELATIONS','SUPERINTENDENT'],
          route: '/expense-details',
        },
        {
          id: 'expense_report',
          label: 'Expense Report',
          icon: 'summarize',
          allowedRoles: ['ADMIN'],
          route: '/expense-report',
        },
        {
          id: 'trust_children',
          label: 'Trust Children',
          icon: 'child_care',
          allowedRoles: ['ADMIN', 'SUPERINTENDENT','OT', 'ONLINE PAYMENT TEAM'],
          route: '/trust-children',
        },
        {
          id: 'branch_vehicles',
          label: 'Vehicle Details',
          icon: 'directions_car',
          allowedRoles: ['ADMIN', 'TL', 'SUPERINTENDENT', 'MANAGER'],
          route: '/branch-vehicles',
        },
        {
          id: 'branch_settings',
          label: 'Branch Setting',
          icon: 'settings',
          allowedRoles: ['ADMIN'],
          route: '/branch-settings',
        },
      ],
    },
    {
      id: 'food_bookings',
      label: 'Food Bookings',
      icon: 'restaurant',
      category: 'Services',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'PUBLIC_RELATIONS'],
      submenus: [
        {
          id: 'food_calendar',
          label: 'Calendar & Bookings',
          icon: 'calendar_today',
          route: '/food-calendar',
          allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'PUBLIC_RELATIONS'],
        },
        {
          id: 'occasions',
          label: 'Occasion Setup',
          icon: 'celebration',
          route: '/occasions',
          allowedRoles: ['ADMIN'],
        }
      ]
    },
    {
      id: 'feedback_details',
      label: 'Feedback Details',
      icon: 'reviews',
      category: 'Operations',
      allowedRoles: ['ADMIN'],
      route: '/feedback-details',
    },
    {
      id: 'feedbacks',
      label: 'Feedbacks',
      icon: 'reviews',
      category: 'Operations',
      allowedRoles: ['TC'],
      route: '/feedbacks',
    },
  ];

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const targetUrl = event.urlAfterRedirects || event.url;
        this.activeMenuId.set(this.determineActiveMenuFromUrl(targetUrl));
      });
  }

  ngOnInit(): void {
    this.activeMenuId.set(this.determineActiveMenuFromUrl(this.router.url));
  }

  // Computed filtered items based on user role AND search query
  filteredMenuItems = computed(() => {
    const activeRole = this.primaryRole;
    const userRoles = this.userRoles;
    const query = this.searchQuery().trim().toLowerCase();

    const hasRoleAccess = (allowedRoles?: string[]) => {
      if (!allowedRoles || allowedRoles.length === 0) return true;
      if (activeRole === 'MANAGER') {
        return allowedRoles.includes('MANAGER');
      }
      if (activeRole && allowedRoles.includes(activeRole)) return true;
      return allowedRoles.some((r) => userRoles.includes(r));
    };

    return this.menuItems
      .filter((item) => hasRoleAccess(item.allowedRoles))
      .map((item) => {
        const validSubmenus = item.submenus
          ? item.submenus
              .filter((sub) => hasRoleAccess(sub.allowedRoles))
              .map((sub) => {
                const validNested = sub.submenus
                  ? sub.submenus.filter((nested) => hasRoleAccess(nested.allowedRoles))
                  : undefined;
                return {
                  ...sub,
                  submenus: validNested && validNested.length > 0 ? validNested : undefined,
                };
              })
              .filter((sub) => !sub.submenus || (sub.submenus && sub.submenus.length > 0))
          : undefined;

        return {
          ...item,
          submenus: validSubmenus,
        };
      })
      .filter((item) => !item.submenus || (item.submenus && item.submenus.length > 0))
      .filter((item) => {
        if (!query) return true;

        const matchesLabel = item.label.toLowerCase().includes(query);
        const matchesCategory = item.category ? item.category.toLowerCase().includes(query) : false;
        const matchesSubmenu = item.submenus
          ? item.submenus.some(
              (sub) =>
                sub.label.toLowerCase().includes(query) ||
                (sub.submenus && sub.submenus.some((nested) => nested.label.toLowerCase().includes(query)))
            )
          : false;

        return matchesLabel || matchesCategory || matchesSubmenu;
      });
  });

  private determineActiveMenuFromUrl(targetUrl?: string): string {
    const rawUrl = targetUrl || this.router.url || '';
    const cleanUrl = rawUrl.split('?')[0].split('#')[0];

    // 1. Role-dependent & alias routes that don't match standard item.route
    if (cleanUrl.includes('/approved-records')) {
      if (this.primaryRole === 'TC') {
        return 'approved-records';
      }
      this.expandedMenuIds.update((set) => new Set(set).add('online_status'));
      return 'approved_records_admin';
    }

    if (cleanUrl.includes('/online-history')) {
      if (this.primaryRole === 'TC') {
        return 'online_history_tc';
      }
      this.expandedMenuIds.update((set) => new Set(set).add('online_status'));
      return 'online_history';
    }

    if (cleanUrl.includes('/admins')) {
      this.expandedMenuIds.update((set) => new Set(set).add('users'));
      return 'admin';
    }

    if (cleanUrl.includes('/telecallers')) {
      this.expandedMenuIds.update((set) => new Set(set).add('users'));
      return 'telecaller';
    }

    if (cleanUrl.includes('/managers')) {
      this.expandedMenuIds.update((set) => new Set(set).add('users'));
      return 'manager';
    }

    if (cleanUrl === '/receipts' || cleanUrl === '/receipts/') {
      this.expandedMenuIds.update((set) => new Set(set).add('receipts'));
      return this.primaryRole === 'OT' || this.primaryRole === 'ONLINE PAYMENT TEAM' || this.primaryRole === 'PUBLIC_RELATIONS'
        ? 'trust_receipts'
        : 'receipts_view';
    }

    if (cleanUrl === '/users' || cleanUrl === '/users/') {
      this.expandedMenuIds.update((set) => new Set(set).add('users'));
      return 'all_users';
    }

    // 2. Check submenus first (including nested submenus)
    for (const item of this.menuItems) {
      if (item.submenus) {
        for (const sub of item.submenus) {
          if (sub.submenus) {
            for (const nested of sub.submenus) {
              if (nested.route && cleanUrl.includes(nested.route)) {
                this.expandedMenuIds.update((set) => new Set(set).add(item.id).add(sub.id));
                return nested.id;
              }
            }
          }
          if (sub.route && cleanUrl.includes(sub.route)) {
            // Auto-expand parent menu when child is active
            this.expandedMenuIds.update((set) => new Set(set).add(item.id));
            return sub.id;
          }
        }
      }
    }

    // 3. Check top-level items with matching route
    for (const item of this.menuItems) {
      if (item.route && cleanUrl.includes(item.route)) {
        return item.id;
      }
    }

    return 'dashboard';
  }

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
    this.collapseChange.emit(this.isCollapsed());
  }

  isMenuExpanded(menuId: string): boolean {
    return this.expandedMenuIds().has(menuId);
  }

  toggleSubmenu(menuId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.expandedMenuIds.update((set) => {
      const next = new Set(set);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  }

  selectMenu(itemId: string, hasSubmenus = false): void {
    if (itemId !== 'dashboard' && !this.checkInService.hasCheckedInToday()) {
      const item = this.menuItems.find((m) => m.id === itemId);

      let title = 'Device Authorization Required';
      let message =
        'To access ERP modules and data, you must first complete your attendance check-in to authorize this device.';

      if (this.checkInService.hasCheckedOutToday()) {
        title = 'Shift Completed';
        message =
          'Your shift has been completed for today. You cannot access modules after checking out. Please log out.';
      }

      this.modalService.show({
        title: title,
        message: message,
        targetModule: item?.label || 'this module',
      });
      return;
    }

    if (hasSubmenus) {
      this.toggleSubmenu(itemId);
    } else {
      this.activeMenuId.set(itemId);
      const item = this.menuItems.find((m) => m.id === itemId);

      if (item) {
        if (item.route) {
          this.router.navigateByUrl(item.route);
        }
        this.menuSelect.emit({ id: item.id, label: item.label, icon: item.icon });
      }
      this.closeMobileDrawer.emit();
    }
  }

  isSubmenuActive(sub: SubMenuItem): boolean {
    if (this.activeMenuId() === sub.id) return true;
    if (sub.submenus) {
      return sub.submenus.some((nested) => nested.id === this.activeMenuId());
    }
    return false;
  }

  selectSubmenu(parentMenuId: string, subItemId: string, event?: Event, customSub?: SubMenuItem): void {
    const parent = this.menuItems.find((m) => m.id === parentMenuId);
    let sub = customSub;
    let effectiveParentLabel = parent?.label;

    if (!sub) {
      for (const s of parent?.submenus || []) {
        if (s.id === subItemId) {
          sub = s;
          break;
        }
        const nested = s.submenus?.find((n) => n.id === subItemId);
        if (nested) {
          sub = nested;
          effectiveParentLabel = s.label;
          break;
        }
      }
    } else {
      for (const s of parent?.submenus || []) {
        if (s.submenus?.some((n) => n.id === subItemId)) {
          effectiveParentLabel = s.label;
          break;
        }
      }
    }

    if (parentMenuId !== 'dashboard' && !this.checkInService.hasCheckedInToday()) {
      let title = 'Device Authorization Required';
      let message =
        'To access ERP modules and data, you must first complete your attendance check-in to authorize this device.';

      if (this.checkInService.hasCheckedOutToday()) {
        title = 'Shift Completed';
        message =
          'Your shift has been completed for today. You cannot access modules after checking out. Please log out.';
      }

      this.modalService.show({
        title: title,
        message: message,
        targetModule: sub?.label || 'this module',
      });
      return;
    }

    if (event) {
      event.stopPropagation();
    }
    this.activeMenuId.set(subItemId);

    if (sub && parent) {
      if (sub.route) {
        this.router.navigateByUrl(sub.route);
      }
      this.menuSelect.emit({
        id: sub.id,
        label: sub.label,
        parentLabel: effectiveParentLabel,
        icon: sub.icon || parent.icon,
      });
    }
    this.closeMobileDrawer.emit();
  }

  onLogout(): void {
    if (this.checkInService.hasCheckedInToday()) {
      this.modalService.show({
        title: 'Checkout Required',
        message:
          'You are currently checked in for attendance. You must check out on the dashboard before logging out of the system.',
      });
      return;
    }
    this.logout.emit();
  }
}
