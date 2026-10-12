import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevToolsProtectionService {
  private active = false;

  init(): void {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;

    // 1. Block right-click context menu
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 2. Block DevTools shortcut keys (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Mac Cmd+Opt+I, etc.)
    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (
        e.key === 'F12' ||
        (cmdOrCtrl && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (cmdOrCtrl && ['U', 'u', 'S', 's'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerTrap();
      }
    });

    // 3. Periodic debugger trap execution
    setInterval(() => {
      this.triggerTrap();
    }, 1500);
  }

  triggerTrap(): void {
    try {
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
    } catch (e) {}
  }
}
