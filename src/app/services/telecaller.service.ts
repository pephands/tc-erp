import { Injectable, signal } from '@angular/core';
import { Telecaller, MOCK_TELECALLERS } from '../models/telecaller.model';

@Injectable({
  providedIn: 'root'
})
export class TelecallerService {
  readonly telecallers = signal<Telecaller[]>(MOCK_TELECALLERS);

  getTelecallers(): Telecaller[] {
    return this.telecallers();
  }

  toggleStatus(id: string): void {
    const current = this.telecallers();
    const index = current.findIndex(t => t.id === id);
    if (index !== -1) {
      const copy = [...current];
      const newStatus = copy[index].status === 'Active' ? 'InActive' : 'Active';
      copy[index] = { ...copy[index], status: newStatus };
      this.telecallers.set(copy);
    }
  }

  updateTelecaller(updated: Telecaller): boolean {
    const current = this.telecallers();
    const index = current.findIndex(t => t.id === updated.id);
    if (index !== -1) {
      const copy = [...current];
      copy[index] = { ...updated };
      this.telecallers.set(copy);
      return true;
    }
    return false;
  }

  deleteTelecaller(id: string): boolean {
    this.telecallers.set(this.telecallers().filter(t => t.id !== id));
    return true;
  }
}
