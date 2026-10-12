import { HttpInterceptorFn } from '@angular/common/http';
import { DevToolsProtectionService } from '../services/devtools-protection.service';

/**
 * Anti-Tamper Security Interceptor
 * Triggers a debugger trap whenever an HTTP API call is initiated or returns,
 * freezing script execution if DevTools is open.
 */
export const antiTamperInterceptor: HttpInterceptorFn = (req, next) => {
  // If debugger protection is disabled, bypass immediately
  if (!DevToolsProtectionService.isEnabled) {
    return next(req);
  }

  // Trigger debugger before request dispatch
  (function () {
    (function a() {
      try {
        (function b(i) {
          if (('' + i / i).length !== 1 || i % 20 === 0) {
            (function () {}.constructor('debugger')());
          } else {
            debugger;
          }
          b(++i);
        })(0);
      } catch (e) {}
    })();
  })();

  return next(req);
};
