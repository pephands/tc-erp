import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Authentication & Session Interceptor
 * Intercepts HTTP 401 Unauthorized responses. If an active session's token
 * has been invalidated (e.g. by logging in from another device), clears local
 * storage and reactive signals, and redirects to the login screen with an explanatory message.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isUnauthorized =
        error.status === 401 ||
        (error.status === 403 &&
          typeof error.error?.detail === 'string' &&
          (error.error.detail.toLowerCase().includes('token') ||
           error.error.detail.toLowerCase().includes('credential') ||
           error.error.detail.toLowerCase().includes('authentication')));

      if (isUnauthorized) {
        const url = req.url || '';
        const isExcluded =
          url.includes('/accounts/login/') ||
          url.includes('/accounts/verify-device-transfer/');

        if (!isExcluded && !router.url.includes('/login')) {
          try {
            const authService = injector.get(AuthService);
            authService.forceSessionLogout('session_transferred');
          } catch (_) {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('tc_erp_auth_session');
              localStorage.removeItem('tc_erp_last_checkin_date');
              localStorage.removeItem('tc_erp_has_checked_out_date');
              localStorage.removeItem('tc_erp_attendance_id');
              localStorage.removeItem('tc_erp_checkin_time');
              localStorage.removeItem('tc_erp_is_wfh');
            }
          }

          router.navigate(['/login'], {
            queryParams: { sessionTransferred: 'true' },
            replaceUrl: true
          });
        }
      }
      return throwError(() => error);
    })
  );
};
