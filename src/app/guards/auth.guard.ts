import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

    const userRoles = authService.userRoles();
    let primaryRole = '';
    if (userRoles.includes('ADMIN')) primaryRole = 'ADMIN';
    else if (userRoles.includes('MANAGER')) primaryRole = 'MANAGER';
    else if (userRoles.includes('SUPERINTENDENT')) primaryRole = 'SUPERINTENDENT';
    else if (userRoles.includes('TL')) primaryRole = 'TL';
    else if (userRoles.includes('OT') || userRoles.includes('ONLINE PAYMENT TEAM')) primaryRole = 'OT';
    else if (userRoles.includes('TCT')) primaryRole = 'TCT';
    else if (userRoles.includes('PUBLIC_RELATIONS') || userRoles.includes('PUBLIC RELATIONSHIP OFFICER') || userRoles.includes('PR')) primaryRole = 'PUBLIC_RELATIONS';
    else if (userRoles.includes('TC')) primaryRole = 'TC';
    else if (userRoles.length > 0) primaryRole = userRoles[0];

    // Follow exact sidebar access check:
    // When primaryRole is MANAGER, only allow if MANAGER is explicitly in allowedRoles
    if (primaryRole === 'MANAGER') {
      if (allowedRoles.includes('MANAGER')) {
        return true;
      }
      return router.createUrlTree(['/dashboard']);
    }

    if (primaryRole && allowedRoles.includes(primaryRole)) {
      return true;
    }

    if (authService.hasRole(allowedRoles)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
};
