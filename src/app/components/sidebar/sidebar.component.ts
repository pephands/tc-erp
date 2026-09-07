import { Component, EventEmitter, Input, Output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { User, UserRole } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

export interface SubMenuItem {
  id: string;
  label: string;
  icon?: string;
  allowedRoles?: UserRole[];
  route?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeClass?: string;
  category?: string;
  allowedRoles?: UserRole[];
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
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
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
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', category: 'Core', allowedRoles: ['ADMIN', 'TL', 'TC'], route: '/dashboard' },
    { id: 'branches', label: 'Branches', icon: 'domain', category: 'Core', allowedRoles: ['ADMIN'], route: '/branches' },
    { id: 'managers', label: 'Managers', icon: 'manage_accounts', category: 'Team', allowedRoles: ['ADMIN'], route: '/managers' },
    { id: 'telecallers', label: 'TeleCallers', icon: 'support_agent', category: 'Team', allowedRoles: ['ADMIN', 'TL', 'TC'], route: '/telecallers' },
    { id: 'attendance', label: 'Attendance Details', icon: 'event_available', category: 'Operations', allowedRoles: ['ADMIN', 'TL', 'TC'], route: '/attendance' },
    { id: 'approve_assign', label: 'Approve/Assign Base', icon: 'assignment_ind', category: 'Operations', allowedRoles: ['ADMIN', 'TL', 'TC'], route: '/approve-assign' },
    { 
      id: 'branch_details', 
      label: 'Branch Details', 
      icon: 'location_city', 
      category: 'Core', 
      allowedRoles: ['ADMIN', 'TL'],
      submenus: [
        { id: 'branch_documents', label: 'Branch Documents', icon: 'folder_shared', allowedRoles: ['ADMIN', 'TL', 'TC'], route: '/branch-documents' },
        { id: 'expense_details', label: 'Expense Details', icon: 'receipt', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'expense_report', label: 'Expense Report', icon: 'summarize', allowedRoles: ['ADMIN', 'TL'] }
      ]
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: 'insights', 
      category: 'Analytics', 
      allowedRoles: ['ADMIN', 'TL'],
      submenus: [
        { id: 'received_status', label: 'Received Status', icon: 'dataset', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'live_report', label: 'Live Report', icon: 'monitoring', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'report', label: 'Report', icon: 'analytics', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'base_task_report', label: 'Base Task Report', icon: 'task_alt', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'attendance_report', label: 'Attendance Report', icon: 'co_present', allowedRoles: ['ADMIN', 'TL'] }
      ]
    },
    { 
      id: 'history', 
      label: 'History', 
      icon: 'history', 
      category: 'Analytics', 
      allowedRoles: ['ADMIN', 'TL'],
      submenus: [
        { id: 'main_history', label: 'History', icon: 'manage_history', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'pickup_history', label: 'Pickup History', icon: 'package_2', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'base_history', label: 'Base History', icon: 'database', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'trust_history', label: 'Trust History', icon: 'verified_user', allowedRoles: ['ADMIN', 'TL'] },
        { id: 'dob_history', label: 'DOB History', icon: 'cake', allowedRoles: ['ADMIN', 'TL'] }
      ]
    },
    { 
      id: 'whatsapp', 
      label: 'Whatsapp', 
      icon: 'chat', 
      category: 'Communication', 
      allowedRoles: ['ADMIN', 'TL', 'TC'],
      submenus: [
        { id: 'whatsapp_greentick', label: 'Whatsapp GreenTick', icon: 'verified', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'send_whatsapp_10be', label: 'Send Whatsapp(Form 10BE)', icon: 'send', allowedRoles: ['ADMIN', 'TL', 'TC'] }
      ]
    },
    { id: 'online_status', label: 'Online Received Status', icon: 'sync_alt', category: 'Finance', allowedRoles: ['ADMIN', 'TL'] },
    { 
      id: 'receipts', 
      label: 'Receipts', 
      icon: 'receipt_long', 
      category: 'Finance', 
      allowedRoles: ['ADMIN', 'TL', 'TC'],
      submenus: [
        { id: 'daily_bulk_receipt', label: 'Daily Bulk Receipt', icon: 'receipt_long', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'create_view_receipt', label: 'Create / View Receipt', icon: 'post_add', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'receipt_history', label: 'Receipt History', icon: 'history', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'annual_receipt_23_24', label: '2023-24: Annual Receipt', icon: 'calendar_today', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'annual_receipt_22_23', label: '2022-23: Annual Receipt', icon: 'calendar_month', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'bulk_download', label: 'Bulk Download', icon: 'cloud_download', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'trust_receipt_history', label: 'Trust Receipt History', icon: 'history_edu', allowedRoles: ['ADMIN', 'TL', 'TC'] },
        { id: 'pickup_receipt', label: 'Pickup Receipt', icon: 'pin_drop', allowedRoles: ['ADMIN', 'TL', 'TC'] }
      ]
    },
    { id: 'food_bookings', label: 'Food Bookings', icon: 'restaurant', category: 'Services', allowedRoles: ['ADMIN', 'TL', 'TC'] },
    { id: 'upload_pan', label: 'Upload PAN Details', icon: 'badge', category: 'Compliance', allowedRoles: ['ADMIN', 'TL', 'TC'] },
    { id: 'website_activities', label: 'Website Activities', icon: 'web', category: 'Analytics', allowedRoles: ['ADMIN', 'TL'] },
    { id: 'feedback_details', label: 'Feedback Details', icon: 'reviews', category: 'Operations', allowedRoles: ['ADMIN', 'TL', 'TC'] },
    { id: 'template_details', label: 'Template Details', icon: 'dashboard_customize', category: 'Operations', allowedRoles: ['ADMIN', 'TL'] },
    { id: 'work_details', label: 'Work Details', icon: 'work_history', category: 'Operations', allowedRoles: ['ADMIN', 'TL', 'TC'] }
  ];

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const targetUrl = event.urlAfterRedirects || event.url;
      this.activeMenuId.set(this.determineActiveMenuFromUrl(targetUrl));
    });
  }

  ngOnInit(): void {
    this.activeMenuId.set(this.determineActiveMenuFromUrl(this.router.url));
  }

  // Computed filtered items based on user role AND search query
  filteredMenuItems = computed(() => {
    const userRole = this.currentUser?.role || this.authService.userRole();
    const query = this.searchQuery().trim().toLowerCase();

    return this.menuItems
      .filter(item => {
        if (item.allowedRoles && userRole && !item.allowedRoles.includes(userRole)) {
          return false;
        }
        return true;
      })
      .map(item => {
        const validSubmenus = item.submenus ? item.submenus.filter(sub => {
          if (sub.allowedRoles && userRole && !sub.allowedRoles.includes(userRole)) {
            return false;
          }
          return true;
        }) : undefined;

        return {
          ...item,
          submenus: validSubmenus
        };
      })
      .filter(item => {
        if (!query) return true;
        
        const matchesLabel = item.label.toLowerCase().includes(query);
        const matchesCategory = item.category ? item.category.toLowerCase().includes(query) : false;
        const matchesSubmenu = item.submenus ? item.submenus.some(sub => sub.label.toLowerCase().includes(query)) : false;

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
    if (url.includes('/branch-documents')) return 'branch_documents';
    if (url.includes('/dashboard')) return 'dashboard';
    return 'dashboard';
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
    this.collapseChange.emit(this.isCollapsed());
  }

  isMenuExpanded(menuId: string): boolean {
    return this.expandedMenuIds().has(menuId);
  }

  toggleSubmenu(menuId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.expandedMenuIds.update(set => {
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
    if (hasSubmenus) {
      this.toggleSubmenu(itemId);
    } else {
      this.activeMenuId.set(itemId);
      const item = this.menuItems.find(m => m.id === itemId);
      
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
    if (event) {
      event.stopPropagation();
    }
    this.activeMenuId.set(subItemId);
    const parent = this.menuItems.find(m => m.id === parentMenuId);
    const sub = parent?.submenus?.find(s => s.id === subItemId);
    if (sub && parent) {
      if (sub.route) {
        this.router.navigateByUrl(sub.route);
      }
      this.menuSelect.emit({
        id: sub.id,
        label: sub.label,
        parentLabel: parent.label,
        icon: sub.icon || parent.icon
      });
    }
    this.closeMobileDrawer.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
