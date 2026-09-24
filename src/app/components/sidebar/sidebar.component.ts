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
    if (roles.includes('TL')) return 'TL';
    if (roles.includes('TC')) return 'TC';
    return '';
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
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'TC'],
      route: '/dashboard',
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
          id: 'manager',
          label: 'Manager',
          icon: 'manage_accounts',
          allowedRoles: ['ADMIN'],
          route: '/users/manager',
        },
        {
          id: 'backend',
          label: 'Backend',
          icon: 'computer',
          allowedRoles: ['ADMIN'],
          route: '/users/backend',
        },
        {
          id: 'driver',
          label: 'Driver',
          icon: 'directions_car',
          allowedRoles: ['ADMIN'],
          route: '/users/driver',
        },
        {
          id: 'cook',
          label: 'Cook',
          icon: 'restaurant',
          allowedRoles: ['ADMIN'],
          route: '/users/cook',
        },
        {
          id: 'assistant_cook',
          label: 'Assistant Cook',
          icon: 'soup_kitchen',
          allowedRoles: ['ADMIN'],
          route: '/users/assistant-cook',
        },
        {
          id: 'public_relations',
          label: 'Public Relations',
          icon: 'campaign',
          allowedRoles: ['ADMIN'],
          route: '/users/public-relations',
        },
        {
          id: 'counselor',
          label: 'Counselor',
          icon: 'psychology',
          allowedRoles: ['ADMIN'],
          route: '/users/counselor',
        },
        {
          id: 'superintendent',
          label: 'Superintendent',
          icon: 'badge',
          allowedRoles: ['ADMIN'],
          route: '/users/superintendent',
        },
      ],
    },
    {
      id: 'attendance',
      label: 'Attendance Details',
      icon: 'event_available',
      category: 'Operations',
      allowedRoles: ['ADMIN', 'MANAGER', 'TL', 'TC'],
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
      id: 'send-records',
      label: 'Send Records',
      icon: 'payments',
      category: 'Operations',
      allowedRoles: ['TC'],
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
      allowedRoles: ['ADMIN', 'MANAGER', 'TL'],
      submenus: [
        {
          id: 'live_batch',
          label: 'Live Batch',
          icon: 'speed',
          allowedRoles: ['ADMIN', 'MANAGER'],
          route: '/live-batch',
        },
        {
          id: 'batch_reports',
          label: 'Batch Details',
          icon: 'receipt_long',
          allowedRoles: ['ADMIN', 'MANAGER', 'TL'],
          route: '/batch-reports',
        },
        {
          id: 'batch_settings',
          label: 'Batch Setting',
          icon: 'settings',
          allowedRoles: ['ADMIN'],
          route: '/batch-settings',
        },
        {
          id: 'approved_records_admin',
          label: 'Approved Records',
          icon: 'verified',
          allowedRoles: ['ADMIN', 'TL'],
          route: '/approved-records',
        },
        {
          id: 'online_history',
          label: 'Payment History',
          icon: 'history_toggle_off',
          allowedRoles: ['ADMIN', 'TL'],
          route: '/online-history',
        },
        {
          id: 'verified_donors',
          label: 'Verified Donors',
          icon: 'how_to_reg',
          allowedRoles: ['ADMIN'],
          route: '/verified-donors',
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
        // {
        //   id: 'whatsapp_greentick',
        //   label: 'Whatsapp GreenTick',
        //   icon: 'verified',
        //   allowedRoles: ['ADMIN', 'TL', 'TC'],
        // },
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
      ],
    },

    {
      id: 'receipts',
      label: 'Receipts',
      icon: 'receipt_long',
      category: 'Finance',
      allowedRoles: ['ADMIN', 'TL', 'TC'],
      submenus: [
        {
          id: 'view_receipt',
          label: 'View Receipt',
          icon: 'receipt',
          allowedRoles: ['ADMIN', 'TL', 'TC'],
          route: '/receipts/view',
        },
        {
          id: 'create_receipt',
          label: 'Create Receipt',
          icon: 'post_add',
          allowedRoles: ['ADMIN'],
          route: '/receipts/create',
        },
      ],
    },

    {
      id: 'branch_details',
      label: 'Branch Details',
      icon: 'location_city',
      category: 'Core',
      allowedRoles: ['ADMIN', 'TL'],
      submenus: [
        {
          id: 'branch_documents',
          label: 'Branch Documents',
          icon: 'folder_shared',
          allowedRoles: ['ADMIN', 'TL', 'TC'],
          route: '/branch-documents',
        },
        {
          id: 'expense_details',
          label: 'Expense Details',
          icon: 'receipt',
          allowedRoles: ['ADMIN', 'TL'],
          route: '/expense-details',
        },
        {
          id: 'expense_report',
          label: 'Expense Report',
          icon: 'summarize',
          allowedRoles: ['ADMIN'],
          route: '/expense-report',
        },
      ],
    },
    // {
    //   id: 'reports',
    //   label: 'Reports',
    //   icon: 'insights',
    //   category: 'Analytics',
    //   allowedRoles: ['ADMIN', 'TL'],
    //   submenus: [
    //     {
    //       id: 'received_status',
    //       label: 'Received Status',
    //       icon: 'dataset',
    //       allowedRoles: ['ADMIN', 'TL'],
    //       route: '/received-status',
    //     },
    //     {
    //       id: 'live_report',
    //       label: 'Live Report',
    //       icon: 'monitoring',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'report',
    //       label: 'Report',
    //       icon: 'analytics',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'base_task_report',
    //       label: 'Base Task Report',
    //       icon: 'task_alt',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'attendance_report',
    //       label: 'Attendance Report',
    //       icon: 'co_present',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //   ],
    // },
    // {
    //   id: 'history',
    //   label: 'History',
    //   icon: 'history',
    //   category: 'Analytics',
    //   allowedRoles: ['ADMIN', 'TL'],
    //   submenus: [
    //     {
    //       id: 'main_history',
    //       label: 'History',
    //       icon: 'manage_history',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'pickup_history',
    //       label: 'Pickup History',
    //       icon: 'package_2',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'base_history',
    //       label: 'Base History',
    //       icon: 'database',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'trust_history',
    //       label: 'Trust History',
    //       icon: 'verified_user',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //     {
    //       id: 'dob_history',
    //       label: 'DOB History',
    //       icon: 'cake',
    //       allowedRoles: ['ADMIN', 'TL'],
    //     },
    //   ],
    // },

    {
      id: 'food_bookings',
      label: 'Food Bookings',
      icon: 'restaurant',
      category: 'Services',
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'upload_pan',
      label: 'Upload PAN Details',
      icon: 'badge',
      category: 'Compliance',
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'website_activities',
      label: 'Website Activities',
      icon: 'web',
      category: 'Analytics',
      allowedRoles: ['ADMIN'],
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
    // {
    //   id: 'work_details',
    //   label: 'Work Details',
    //   icon: 'work_history',
    //   category: 'Operations',
    //   allowedRoles: ['ADMIN', 'TL'],
    //   route: '/work-details',
    // },
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
    const query = this.searchQuery().trim().toLowerCase();

    return this.menuItems
      .filter((item) => {
        if (
          item.allowedRoles &&
          activeRole &&
          !item.allowedRoles.includes(activeRole)
        ) {
          return false;
        }

        return true;
      })
      .map((item) => {
        const validSubmenus = item.submenus
          ? item.submenus.filter((sub) => {
            if (
              sub.allowedRoles &&
              activeRole &&
              !sub.allowedRoles.includes(activeRole)
            ) {
              return false;
            }
            return true;
          })
          : undefined;

        return {
          ...item,
          submenus: validSubmenus,
        };
      })
      .filter((item) => {
        if (!query) return true;

        const matchesLabel = item.label.toLowerCase().includes(query);
        const matchesCategory = item.category ? item.category.toLowerCase().includes(query) : false;
        const matchesSubmenu = item.submenus
          ? item.submenus.some((sub) => sub.label.toLowerCase().includes(query))
          : false;

        return matchesLabel || matchesCategory || matchesSubmenu;
      });
  });

  private determineActiveMenuFromUrl(targetUrl?: string): string {
    const url = targetUrl || this.router.url;
    if (url.includes('/branches')) return 'branches';
    if (url.includes('/managers')) return 'managers';
    if (url.includes('/telecallers')) return 'telecallers';
    if (url.includes('/attendance')) return 'attendance';
    if (url.includes('/approve-assign')) return 'approve_assign';
    if (url.includes('/tl-data-management')) return 'tl_data_management';
    if (url.includes('/work-details') || url.includes('/telecaller-workstation') || url.includes('/workstation'))
      return 'workstation';
    if (url.includes('/branch-documents')) return 'branch_documents';
    if (url.includes('/expense-details')) return 'expense_details';
    if (url.includes('/expense-report')) return 'expense_report';
    if (url.includes('/whatsapp-accounts')) return 'whatsapp_accounts';
    if (url.includes('/whatsapp-campaigns')) return 'whatsapp_campaigns';
    if (url.includes('/send-records')) return 'send-records';
    if (url.includes('/approved-records')) return 'approved-records';
    if (url.includes('/received-records')) return 'received-records';
    if (url.includes('/batch-reports')) return 'batch_reports';
    if (url.includes('/received-status')) return 'received_status';
    if (url.includes('/batch-settings')) return 'batch_settings';
    if (url.includes('/online-history')) return 'online_history';
    if (url.includes('/live-batch')) return 'live_batch';
    if (url.includes('/verified-donors')) return 'verified_donors';
    if (url.includes('/dashboard')) return 'dashboard';
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

  selectSubmenu(parentMenuId: string, subItemId: string, event?: Event): void {
    if (parentMenuId !== 'dashboard' && !this.checkInService.hasCheckedInToday()) {
      const parent = this.menuItems.find((m) => m.id === parentMenuId);
      const sub = parent?.submenus?.find((s) => s.id === subItemId);

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
    const parent = this.menuItems.find((m) => m.id === parentMenuId);
    const sub = parent?.submenus?.find((s) => s.id === subItemId);
    if (sub && parent) {
      if (sub.route) {
        this.router.navigateByUrl(sub.route);
      }
      this.menuSelect.emit({
        id: sub.id,
        label: sub.label,
        parentLabel: parent.label,
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
