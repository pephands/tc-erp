import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SecurityNoticeModalService } from '../services/security-notice-modal.service';
import { ToastService } from '../services/toast.service';

export const ROUTE_ROLE_PERMISSIONS: Record<string, string[]> = {
  'dashboard': ['ADMIN', 'MANAGER', 'TL', 'TC', 'SUPERINTENDENT', 'PUBLIC_RELATIONS', 'USER', 'OT', 'TCT'],
  'announcements': ['ADMIN', 'TL', 'TC', 'OT'],
  'branches': ['ADMIN'],
  'users/all': ['ADMIN'],
  'users/telecaller': ['ADMIN', 'MANAGER', 'TL'],
  'users/team-leader': ['ADMIN', 'MANAGER'],
  'users/backend': ['ADMIN'],
  'users/manager': ['ADMIN'],
  'users/admin': ['ADMIN'],
  'users/driver': ['ADMIN'],
  'users/cook': ['ADMIN'],
  'users/assistant-cook': ['ADMIN'],
  'users/public-relations': ['ADMIN'],
  'users/counselor': ['ADMIN'],
  'users/superintendent': ['ADMIN'],
  'users/trust-users': ['ADMIN', 'SUPERINTENDENT'],
  'users/outreach-team/district-coordinator': ['ADMIN'],
  'users/outreach-team/tuition-teacher': ['ADMIN'],
  'users/outreach-team': ['ADMIN'],
  'users/settings': ['ADMIN'],
  'managers': ['ADMIN'],
  'telecallers': ['ADMIN', 'MANAGER', 'TL'],
  'attendance': ['ADMIN', 'MANAGER', 'TL', 'TC', 'SUPERINTENDENT', 'PUBLIC_RELATIONS', 'OT', 'TCT'],
  'approve-assign': ['ADMIN'],
  'tl-data-management': ['TL'],
  'workstation': ['ADMIN', 'TL', 'TC'],
  'reference-leads': ['ADMIN', 'TL', 'TC'],
  'send-records': ['TC', 'TL'],
  'received-records': ['ADMIN', 'TL', 'TC', 'OT', 'ONLINE PAYMENT TEAM'],
  'approved-records': ['ADMIN', 'TL', 'TC', 'OT', 'ONLINE PAYMENT TEAM'],
  'live-batch': ['ADMIN', 'MANAGER', 'OT', 'ONLINE PAYMENT TEAM'],
  'batch-reports': ['ADMIN', 'TL', 'OT', 'ONLINE PAYMENT TEAM'],
  'batch-settings': ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
  'received-status': ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
  'online-history': ['ADMIN', 'TL', 'TC', 'OT', 'ONLINE PAYMENT TEAM'],
  'verified-donors': ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
  'unclaimed-records': ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'],
  'whatsapp-receipt-settings': ['ADMIN'],
  'whatsapp-accounts': ['ADMIN'],
  'whatsapp-campaigns': ['ADMIN'],
  'whatsapp-send': ['TL', 'TC'],
  'whatsapp-history': ['ADMIN', 'TL', 'TC'],
  'feedbacks': ['TC'],
  'feedback-details': ['ADMIN'],
  'receipts/view': ['ADMIN', 'TL', 'TC', 'TCT', 'OT', 'ONLINE PAYMENT TEAM'],
  'receipts/trust-receipts': ['ADMIN', 'OT', 'ONLINE PAYMENT TEAM', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER'],
  'receipts/batch-receipts': ['ADMIN', 'TCT', 'OT', 'ONLINE PAYMENT TEAM'],
  'receipts/create': ['ADMIN', 'ADMINISTRATOR', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER', 'SUPERINTENDENT'],
  'branch-documents': ['ADMIN', 'TL', 'PUBLIC_RELATIONS', 'SUPERINTENDENT'],
  'branch-vehicles': ['ADMIN', 'TL', 'SUPERINTENDENT', 'MANAGER'],
  'branch-settings': ['ADMIN'],
  'expense-details': ['ADMIN', 'TL', 'PUBLIC_RELATIONS', 'SUPERINTENDENT'],
  'expense-report': ['ADMIN'],
  'trust-children': ['ADMIN', 'SUPERINTENDENT'],
  'food-calendar': ['ADMIN', 'MANAGER', 'TL', 'PUBLIC_RELATIONS'],
  'occasions': ['ADMIN'],
};

export function getRouteAllowedRoles(path: string): string[] | undefined {
  const clean = path.split('?')[0].replace(/^\//, '').replace(/\/$/, '').trim();
  if (ROUTE_ROLE_PERMISSIONS[clean]) {
    return ROUTE_ROLE_PERMISSIONS[clean];
  }
  // Check parameterized routes
  if (clean.startsWith('whatsapp-campaigns/') && clean.endsWith('/templates')) {
    return ROUTE_ROLE_PERMISSIONS['whatsapp-campaigns'];
  }
  return undefined;
}

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    if (authService.hasRoleAccess(allowedRoles)) {
      return true;
    }

    // Role is NOT allowed for this page -> immediately force logout, show custom modal, and redirect to /login
    const securityModalService = inject(SecurityNoticeModalService);
    const toastService = inject(ToastService);

    authService.forceSessionLogout('session_expired');
    securityModalService.show({
      title: 'Security Notice',
      message: 'You do not have permission to access this page. You have been logged out.',
      role: authService.getPrimaryRole() || undefined
    });
    toastService.error(
      'Access Denied',
      'Security Policy: You do not have permission to access this page. Session safely ended.',
      6000
    );
    return router.createUrlTree(['/login']);
  };
};

export const routeSecurityGuard: CanActivateChildFn = (childRoute, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const cleanPath = state.url.split('?')[0].replace(/^\//, '').replace(/\/$/, '').trim();
  const allowedRoles = getRouteAllowedRoles(cleanPath);

  if (allowedRoles && allowedRoles.length > 0) {
    if (!authService.hasRoleAccess(allowedRoles)) {
      const securityModalService = inject(SecurityNoticeModalService);
      const toastService = inject(ToastService);

      authService.forceSessionLogout('session_expired');
      securityModalService.show({
        title: 'Security Notice',
        message: 'You do not have permission to access this page. You have been logged out.',
        role: authService.getPrimaryRole() || undefined
      });
      toastService.error(
        'Access Denied',
        'Security Policy: You do not have permission to access this page. Session safely ended.',
        6000
      );
      return router.createUrlTree(['/login']);
    }
  }

  return true;
};

