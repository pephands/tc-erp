import { Injectable, signal } from '@angular/core';
import { Manager, MOCK_MANAGERS } from '../models/manager.model';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  readonly managers = signal<Manager[]>(MOCK_MANAGERS);

  getManagers(): Manager[] {
    return this.managers();
  }

  getManagerById(id: string): Manager | undefined {
    return this.managers().find(m => m.id === id);
  }

  addManager(data: { fullName: string; mobile: string; gender: 'Male' | 'Female' | 'Other'; branch: string }): Manager {
    const current = this.managers();
    const nextNum = current.length + 700;
    const newId = `ATC_${nextNum}`;
    const cleanBranch = data.branch.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanBranch}.cdc@allthechildrentrust.org`;
    const randomOtp = Math.floor(100000000 + Math.random() * 900000000).toString();

    const newManager: Manager = {
      id: newId,
      fullName: data.fullName.toUpperCase(),
      mobile: data.mobile,
      gender: data.gender,
      email: email,
      role: 'Team Lead',
      branch: data.branch,
      otpDetails: randomOtp,
      status: 'Active'
    };

    this.managers.set([newManager, ...current]);
    return newManager;
  }

  updateManager(updated: Manager): boolean {
    const current = this.managers();
    const index = current.findIndex(m => m.id === updated.id);
    if (index !== -1) {
      const copy = [...current];
      copy[index] = { ...updated };
      this.managers.set(copy);
      return true;
    }
    return false;
  }

  deleteManager(id: string): boolean {
    const current = this.managers();
    this.managers.set(current.filter(m => m.id !== id));
    return true;
  }
}
