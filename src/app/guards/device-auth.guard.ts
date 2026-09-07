import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AttendanceCheckInService } from '../services/attendance-checkin.service';
import { DeviceAuthModalService } from '../services/device-auth-modal.service';

export const deviceAuthGuard: CanActivateFn = (route, state) => {
  const checkInService = inject(AttendanceCheckInService);
  const modalService = inject(DeviceAuthModalService);
  const router = inject(Router);

  // Unrestricted routes where check-in is performed or unauthenticated
  const currentUrl = state.url || '';
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/login')) {
    return true;
  }

  // Device authorization check for all other ERP module screens
  if (checkInService.hasDeviceId()) {
    return true;
  }

  // Show themed modal and redirect to Dashboard
  modalService.show({
    title: 'Device Authorization Required',
    message: 'To access ERP screens and records, you must first complete attendance check-in on the Dashboard to register and authorize this device.'
  });

  return router.createUrlTree(['/dashboard'], { queryParams: { deviceAuthRequired: 'true' } });
};
