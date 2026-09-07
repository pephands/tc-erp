import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<ToastMessage[]>([]);

  show(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration = 4000): void {
    const id = `toast_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newToast: ToastMessage = { id, type, title, message, duration };
    this.toasts.update(list => [...list, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(title: string, message: string, duration = 4000): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message: string, duration = 5000): void {
    this.show('error', title, message, duration);
  }

  warning(title: string, message: string, duration = 4500): void {
    this.show('warning', title, message, duration);
  }

  info(title: string, message: string, duration = 4000): void {
    this.show('info', title, message, duration);
  }

  remove(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
