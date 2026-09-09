import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AttendanceCheckInService } from '../services/attendance-checkin.service';
import { DeviceAuthModalService } from '../services/device-auth-modal.service';

function getTargetModuleName(url: string): string {
  if (url.includes('/branches')) return 'Branches';
  if (url.includes('/managers')) return 'Managers';
  if (url.includes('/telecallers')) return 'TeleCallers';
  if (url.includes('/attendance')) return 'Attendance';
  if (url.includes('/approve-assign')) return 'Task Management';
  if (url.includes('/branch-documents')) return 'Branch Documents';
  return 'this module';
}

export const deviceAuthGuard: CanActivateFn = (route, state) => {
  const checkInService = inject(AttendanceCheckInService);
  const modalService = inject(DeviceAuthModalService);
  const router = inject(Router);

  // Unrestricted routes where check-in is performed or unauthenticated
  const currentUrl = state.url || '';
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/login')) {
    return true;
  }

  // Daily attendance check-in requirement check for all other ERP module screens
  if (checkInService.hasCheckedInToday()) {
    return true;
  }

  let title = 'Check-in Required';
  let message = 'To access ERP screens and records, you must first complete attendance check-in on the Dashboard to register and authorize this device.';
  const targetModule = getTargetModuleName(currentUrl);

  if (checkInService.hasCheckedOutToday()) {
    title = 'Shift Completed';
    message = 'Your shift has been completed for today. You cannot access modules after checking out. Please log out.';
  }

  // Show themed modal and redirect to Dashboard
  modalService.show({
    title: title,
    message: message,
    targetModule: targetModule
  });

  return router.createUrlTree(['/dashboard'], { queryParams: { checkInRequired: 'true' } });
};

