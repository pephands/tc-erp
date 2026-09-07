import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface DeviceAuthModalConfig {
  title?: string;
  message?: string;
  targetModule?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceAuthModalService {
  isOpen = signal<boolean>(false);
  config = signal<DeviceAuthModalConfig>({
    title: 'Device Authorization Required',
    message: 'To access ERP modules and data, you must first complete your attendance check-in to authorize this device.',
    targetModule: ''
  });

  show(config?: DeviceAuthModalConfig): void {
    if (config) {
      this.config.set({
        title: config.title || 'Device Authorization Required',
        message: config.message || 'To access ERP modules and data, you must first complete your attendance check-in to authorize this device.',
        targetModule: config.targetModule || ''
      });
    }
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
