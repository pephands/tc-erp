import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevToolsProtectionService {
  // MASTER TOGGLE: Set to true in production, or set to false to completely disable debugger
  static isEnabled: boolean = false;

  private active = false;

  init(): void {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;

    // 1. Block right-click context menu (Desktop & Mobile long-press)
    window.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    }, { capture: true });

    // 2. Block DevTools shortcut keys across ALL operating systems:
    // Windows, Linux, macOS, ChromeOS, iPadOS/Android external keyboards
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey;
      const isMeta = e.metaKey; // Command key on macOS / Windows key on some setups
      const isAlt = e.altKey;
      const isShift = e.shiftKey;
      const key = (e.key || '').toUpperCase();
      const code = (e.code || '').toUpperCase();

      // F12 or key code 123
      const isF12 = key === 'F12' || code === 'F12' || e.keyCode === 123;

      // Inspect / Console / Element Inspector:
      // Windows/Linux: Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      // macOS: Cmd+Opt+I, Cmd+Opt+J, Cmd+Opt+C or Cmd+Shift+C
      const isInspectKey = ['I', 'J', 'C'].includes(key);
      const isInspectShortcut =
        ((isCtrl || isMeta) && isShift && isInspectKey) ||
        (isMeta && isAlt && isInspectKey) ||
        (isCtrl && isAlt && isInspectKey);

      // View Source & Save Page:
      // Ctrl+U / Cmd+U (View Page Source), Ctrl+S / Cmd+S (Save HTML page)
      const isSourceOrSave = (isCtrl || isMeta) && ['U', 'S'].includes(key);

      // Print / Developer diagnostics:
      // Ctrl+P / Cmd+P, Ctrl+Shift+K (Firefox console)
      const isFirefoxDevTools = (isCtrl || isMeta) && isShift && key === 'K';

      if (isF12 || isInspectShortcut || isSourceOrSave || isFirefoxDevTools) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.triggerTrap();
      }
    }, { capture: true });

    // 3. DevTools docked window resize detection across all desktop devices
    let devToolsOpen = false;
    const checkWindowDiff = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          this.triggerTrap();
        }
      } else {
        devToolsOpen = false;
      }
    };
    window.addEventListener('resize', checkWindowDiff);

    // 4. Periodic debugger trap execution
    setInterval(() => {
      if (DevToolsProtectionService.isEnabled) {
        this.triggerTrap();
      }
    }, 1500);
  }

  triggerTrap(): void {
    if (!DevToolsProtectionService.isEnabled) return;
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
