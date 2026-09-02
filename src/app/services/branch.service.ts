import { Injectable, signal } from '@angular/core';
import { Branch, MOCK_BRANCHES } from '../models/branch.model';

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  readonly branches = signal<Branch[]>(MOCK_BRANCHES);

  getBranches(): Branch[] {
    return this.branches();
  }

  getBranchById(id: number): Branch | undefined {
    return this.branches().find(b => b.id === id);
  }

  addBranch(branchData: Omit<Branch, 'id'>): Branch {
    const current = this.branches();
    const nextId = Math.max(...current.map(b => b.id), 0) + 1;
    const newBranch: Branch = {
      id: nextId,
      ...branchData
    };
    this.branches.set([...current, newBranch]);
    return newBranch;
  }

  updateBranch(updated: Branch): boolean {
    const current = this.branches();
    const index = current.findIndex(b => b.id === updated.id);
    if (index !== -1) {
      const copy = [...current];
      copy[index] = { ...updated };
      this.branches.set(copy);
      return true;
    }
    return false;
  }

  deleteBranch(id: number): boolean {
    const current = this.branches();
    this.branches.set(current.filter(b => b.id !== id));
    return true;
  }
}
