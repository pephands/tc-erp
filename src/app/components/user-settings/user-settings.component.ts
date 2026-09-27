import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesignationService } from '../../services/designation.service';
import { RoleListService } from '../../services/role-list.service';

import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  activeTab: 'designations' | 'roles' = 'designations';

  // Services
  designationService = inject(DesignationService);
  roleService = inject(RoleListService);
  cdr = inject(ChangeDetectorRef);

  // Data
  designations: any[] = [];
  roles: any[] = [];

  // Designation Filters
  designationStatusFilter: string = 'all'; // 'all', 'active', 'inactive'
  designationTrustFilter: string = 'all';  // 'all', 'true', 'false'

  get filteredDesignations() {
    return this.designations.filter(des => {
      let statusMatch = true;
      if (this.designationStatusFilter === 'active') {
        statusMatch = des.is_active === true;
      } else if (this.designationStatusFilter === 'inactive') {
        statusMatch = des.is_active === false;
      }

      let trustMatch = true;
      if (this.designationTrustFilter === 'true') {
        trustMatch = des.is_trust === true;
      } else if (this.designationTrustFilter === 'false') {
        trustMatch = des.is_trust === false;
      }

      return statusMatch && trustMatch;
    });
  }

  // Designation form
  showDesignationModal = false;
  isEditDesignation = false;
  editingDesignationId: number | null = null;
  
  formDesignationName = '';
  formDesignationIsTrust = false;
  isSavingDesignation = false;

  // Role form
  showRoleModal = false;
  editingRoleId: number | null = null;
  formRoleName = '';
  formRoleCode = '';
  isSavingRole = false;

  ngOnInit() {
    this.fetchDesignations();
    this.fetchRoles();
  }

  // --- Designations ---
  fetchDesignations() {
    this.designationService.getDesignations().subscribe({
      next: (res) => {
        console.log('Designations API Response:', res);
        if (res && res.status === 'success' && res.data) {
          this.designations = res.data;
        } else if (Array.isArray(res)) {
          this.designations = res;
        } else if (res && res.results) {
          this.designations = res.results;
        } else if (res && res.data) {
          this.designations = res.data;
        } else {
          this.designations = [];
        }
        console.log('Assigned designations:', this.designations);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching designations', err)
    });
  }

  openDesignationModal(designation?: any) {
    if (designation) {
      this.isEditDesignation = true;
      this.editingDesignationId = designation.id;
      this.formDesignationName = designation.name;
      this.formDesignationIsTrust = designation.is_trust;
    } else {
      this.isEditDesignation = false;
      this.editingDesignationId = null;
      this.formDesignationName = '';
      this.formDesignationIsTrust = false;
    }
    this.showDesignationModal = true;
  }

  closeDesignationModal() {
    this.showDesignationModal = false;
    this.cdr.detectChanges();
  }

  toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  saveDesignation() {
    if (!this.formDesignationName.trim()) return;

    this.isSavingDesignation = true;
    this.cdr.detectChanges();

    const data = {
      name: this.toTitleCase(this.formDesignationName.trim()),
      is_trust: this.formDesignationIsTrust
    };

    if (this.isEditDesignation && this.editingDesignationId) {
      this.designationService.updateDesignation(this.editingDesignationId, data).subscribe({
        next: (res) => {
          this.isSavingDesignation = false;
          this.closeDesignationModal();
          this.fetchDesignations();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSavingDesignation = false;
          console.error(err);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.designationService.createDesignation(data).subscribe({
        next: (res) => {
          this.isSavingDesignation = false;
          this.closeDesignationModal();
          this.fetchDesignations();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSavingDesignation = false;
          console.error(err);
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleDesignationStatus(designation: any) {
    const newStatus = !designation.is_active;
    this.designationService.updateDesignation(designation.id, { is_active: newStatus }).subscribe({
      next: () => this.fetchDesignations(),
      error: (err) => console.error(err)
    });
  }

  // --- Roles ---
  fetchRoles() {
    this.roleService.getRoles().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.roles = res.data;
        } else if (Array.isArray(res)) {
          this.roles = res;
        } else if (res.results) {
          this.roles = res.results;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching roles', err)
    });
  }

  openRoleModal(role: any) {
    this.editingRoleId = role.id;
    this.formRoleName = role.name;
    this.formRoleCode = role.code; // code is usually read-only
    this.showRoleModal = true;
  }

  closeRoleModal() {
    this.showRoleModal = false;
    this.cdr.detectChanges();
  }

  saveRole() {
    if (!this.formRoleName.trim() || !this.editingRoleId) return;
    
    this.isSavingRole = true;
    this.cdr.detectChanges();

    const data = {
      name: this.formRoleName.trim(),
      // not sending code, as it shouldn't be edited easily
    };

    this.roleService.updateRole(this.editingRoleId, data).subscribe({
      next: (res) => {
        this.isSavingRole = false;
        this.closeRoleModal();
        this.fetchRoles();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingRole = false;
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }

  toggleRoleStatus(role: any) {
    const newStatus = !role.is_active;
    this.roleService.updateRole(role.id, { is_active: newStatus }).subscribe({
      next: () => this.fetchRoles(),
      error: (err) => console.error(err)
    });
  }
}
