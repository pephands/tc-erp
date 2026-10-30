import { Injectable, inject, signal, computed } from '@angular/core';
import { PaymentService } from './payment.service';
import { ToastService } from './toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface BulkQueueItem {
  id: number;
  task_id?: string | number;
  donor_name: string;
  mobile_number?: string;
  amount: number | string;
  receipt_id?: string;
  status: 'pending' | 'sending' | 'success' | 'failed';
  error?: string;
}

export interface BulkSessionState {
  items: BulkQueueItem[];
  isTriggering: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  isOpen: boolean;
  total: number;
  sent: number;
  failed: number;
  currentRunningId: number | null;
}

export interface BulkSessionLog {
  timestamp: string;
  total: number;
  sent: number;
  failed: number;
  failures: Array<{ id: number; donor_name: string; mobile_number?: string; error: string }>;
  successes: Array<{ id: number; donor_name: string; mobile_number?: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class BatchReceiptBulkSenderService {
  private paymentService = inject(PaymentService);
  private toastService = inject(ToastService);

  private readonly QUEUE_STORAGE_KEY = 'tc_erp_batch_receipt_active_queue_v1';
  private readonly LOGS_STORAGE_KEY = 'tc_erp_batch_receipt_bulk_logs_v1';

  // State Signals
  queue = signal<BulkQueueItem[]>([]);
  isTriggering = signal<boolean>(false);
  isPaused = signal<boolean>(false);
  isMinimized = signal<boolean>(false);
  isOpen = signal<boolean>(false);
  currentRunningId = signal<number | null>(null);

  // Completed history
  sessionLogs = signal<BulkSessionLog[]>([]);

  // Derived Computations
  totalCount = computed(() => this.queue().length);
  sentCount = computed(() => this.queue().filter((i) => i.status === 'success').length);
  failedCount = computed(() => this.queue().filter((i) => i.status === 'failed').length);
  pendingCount = computed(
    () => this.queue().filter((i) => i.status === 'pending' || i.status === 'sending').length
  );
  progressPercent = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    const processed = this.sentCount() + this.failedCount();
    return Math.round((processed / total) * 100);
  });

  private abortFlag = false;

  constructor() {
    this.restoreFromStorage();
  }

  /**
   * Restores ongoing queue state and logs from localStorage.
   */
  private restoreFromStorage(): void {
    try {
      const rawLogs = localStorage.getItem(this.LOGS_STORAGE_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          this.sessionLogs.set(parsed.slice(0, 15));
        }
      }

      const rawQueue = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (rawQueue) {
        const saved: BulkSessionState = JSON.parse(rawQueue);
        if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
          // Reset any 'sending' status back to 'pending' if page was refreshed midway
          const sanitizedItems = saved.items.map((i) =>
            i.status === 'sending' ? { ...i, status: 'pending' as const } : i
          );
          this.queue.set(sanitizedItems);
          this.isPaused.set(saved.isPaused ?? false);
          this.isMinimized.set(saved.isMinimized ?? false);
          this.isOpen.set(saved.isOpen ?? false);

          // If was running before refresh, auto-resume in background
          if (saved.isTriggering && !saved.isPaused) {
            setTimeout(() => {
              this.startOrResumeDispatch();
            }, 500);
          }
        }
      }
    } catch (err) {
      console.warn('Failed restoring bulk sender state from localStorage:', err);
    }
  }

  /**
   * Persists current active queue state to localStorage.
   */
  private saveStateToStorage(): void {
    try {
      const state: BulkSessionState = {
        items: this.queue(),
        isTriggering: this.isTriggering(),
        isPaused: this.isPaused(),
        isMinimized: this.isMinimized(),
        isOpen: this.isOpen(),
        total: this.totalCount(),
        sent: this.sentCount(),
        failed: this.failedCount(),
        currentRunningId: this.currentRunningId(),
      };
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed saving bulk sender state to localStorage:', err);
    }
  }

  /**
   * Appends records into the active dispatch queue.
   * If records already exist, deduplicates by record ID and adds new ones.
   */
  enqueueRecords(records: any[]): void {
    const existingQueue = this.queue();
    const existingMap = new Map(existingQueue.map((item) => [item.id, item]));

    let addedCount = 0;
    for (const r of records) {
      if (!existingMap.has(r.id)) {
        existingMap.set(r.id, {
          id: r.id,
          task_id: r.task_id,
          donor_name: r.donor_name || `Record #${r.id}`,
          mobile_number: r.mobile_number,
          amount: r.amount || 0,
          receipt_id: r.receipt_id,
          status: 'pending',
        });
        addedCount++;
      }
    }

    const updatedQueue = Array.from(existingMap.values());
    this.queue.set(updatedQueue);
    this.isOpen.set(true);
    this.isMinimized.set(false);
    this.saveStateToStorage();

    if (addedCount > 0) {
      this.toastService.info(
        'Queue Updated',
        `Added ${addedCount} records to WhatsApp dispatch queue (Total: ${updatedQueue.length}).`
      );
    }
  }

  openModal(): void {
    this.isOpen.set(true);
    this.isMinimized.set(false);
    this.saveStateToStorage();
  }

  minimize(): void {
    this.isMinimized.set(true);
    this.saveStateToStorage();
  }

  maximize(): void {
    this.isMinimized.set(false);
    this.isOpen.set(true);
    this.saveStateToStorage();
  }

  closeModal(): void {
    if (this.isTriggering() && !this.isPaused()) {
      if (!confirm('Dispatch is actively running in background. Do you want to pause it or keep running minimized? Click OK to minimize and keep running.')) {
        return;
      }
      this.minimize();
      return;
    }
    this.isOpen.set(false);
    this.saveStateToStorage();
  }

  togglePause(): void {
    const current = this.isPaused();
    this.isPaused.set(!current);
    this.saveStateToStorage();
    if (!current) {
      this.toastService.info('Dispatch Paused', 'WhatsApp dispatch paused. You can resume anytime.');
    } else {
      this.toastService.info('Dispatch Resuming', 'Resuming WhatsApp dispatch...');
    }
  }

  /**
   * Starts or resumes processing the queue sequentially one-by-one.
   */
  async startOrResumeDispatch(): Promise<void> {
    if (this.isTriggering()) {
      if (this.isPaused()) {
        this.togglePause();
      }
      return;
    }

    this.isTriggering.set(true);
    this.isPaused.set(false);
    this.abortFlag = false;
    this.saveStateToStorage();

    const startTime = new Date().toISOString();

    while (this.isTriggering() && !this.abortFlag) {
      // Find the next pending record
      const items = this.queue();
      const nextIndex = items.findIndex((i) => i.status === 'pending');

      if (nextIndex === -1) {
        // All items completed
        break;
      }

      // Check pause
      while (this.isPaused() && this.isTriggering() && !this.abortFlag) {
        await new Promise((res) => setTimeout(res, 200));
      }

      if (!this.isTriggering() || this.abortFlag) {
        break;
      }

      const currentItem = items[nextIndex];
      this.currentRunningId.set(currentItem.id);

      // Update state to 'sending'
      this.updateItemStatus(currentItem.id, 'sending');
      this.saveStateToStorage();

      try {
        await firstValueFrom(this.paymentService.sendWhatsappReceipt(currentItem.id));
        this.updateItemStatus(currentItem.id, 'success');
      } catch (err: any) {
        const errorMsg =
          err?.error?.error || err?.error?.message || err?.message || 'Failed to send WhatsApp';
        this.updateItemStatus(currentItem.id, 'failed', errorMsg);
      }

      this.currentRunningId.set(null);
      this.saveStateToStorage();

      // Safe pause between calls to avoid API throttling
      await new Promise((res) => setTimeout(res, 350));
    }

    this.isTriggering.set(false);
    this.isPaused.set(false);
    this.currentRunningId.set(null);
    this.saveStateToStorage();

    // Log to session history
    const all = this.queue();
    const successes = all
      .filter((i) => i.status === 'success')
      .map((i) => ({ id: i.id, donor_name: i.donor_name, mobile_number: i.mobile_number }));
    const failures = all
      .filter((i) => i.status === 'failed')
      .map((i) => ({
        id: i.id,
        donor_name: i.donor_name,
        mobile_number: i.mobile_number,
        error: i.error || 'Failed',
      }));

    if (successes.length > 0 || failures.length > 0) {
      const sessionLog: BulkSessionLog = {
        timestamp: startTime,
        total: all.length,
        sent: successes.length,
        failed: failures.length,
        failures,
        successes,
      };
      this.addSessionLog(sessionLog);
    }
  }

  private updateItemStatus(
    id: number,
    status: 'pending' | 'sending' | 'success' | 'failed',
    error?: string
  ): void {
    this.queue.update((list) =>
      list.map((item) => (item.id === id ? { ...item, status, error } : item))
    );
  }

  retryFailedItems(): void {
    this.queue.update((list) =>
      list.map((item) => (item.status === 'failed' ? { ...item, status: 'pending', error: undefined } : item))
    );
    this.saveStateToStorage();
    this.startOrResumeDispatch();
  }

  clearQueue(): void {
    if (this.isTriggering()) {
      if (!confirm('Dispatch is in progress. Are you sure you want to stop and clear the queue?')) {
        return;
      }
    }
    this.abortFlag = true;
    this.isTriggering.set(false);
    this.isPaused.set(false);
    this.currentRunningId.set(null);
    this.queue.set([]);
    this.isOpen.set(false);
    this.isMinimized.set(false);
    localStorage.removeItem(this.QUEUE_STORAGE_KEY);
    this.toastService.info('Queue Cleared', 'WhatsApp dispatch queue has been cleared.');
  }

  private addSessionLog(log: BulkSessionLog): void {
    try {
      const current = [log, ...this.sessionLogs()].slice(0, 15);
      this.sessionLogs.set(current);
      localStorage.setItem(this.LOGS_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed saving bulk session log to localStorage', e);
    }
  }
}

