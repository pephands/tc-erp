import { Component } from '@angular/core';
import { UserListComponent } from '../user-list/user-list.component';

@Component({
  selector: 'app-telecallers-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="TC"
      roleTitle="Telecaller"
      roleIcon="support_agent"
      roleDescription="Manage and view all registered Telecaller staff across branches."
    ></app-user-list>
  `
})
export class TelecallersPageComponent {}

@Component({
  selector: 'app-team-leaders-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="TL"
      roleTitle="Team Leader"
      roleIcon="supervisor_account"
      roleDescription="Manage and view all registered Team Leaders across branches."
    ></app-user-list>
  `
})
export class TeamLeadersPageComponent {}

@Component({
  selector: 'app-managers-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="MANAGER"
      roleTitle="Manager"
      roleIcon="manage_accounts"
      roleDescription="Manage and view all registered Branch Managers."
    ></app-user-list>
  `
})
export class ManagersPageComponent {}

@Component({
  selector: 'app-backend-users-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="BACKEND"
      roleTitle="Backend Staff"
      roleIcon="computer"
      roleDescription="Manage and view all registered Backend operational team members."
    ></app-user-list>
  `
})
export class BackendUsersPageComponent {}

@Component({
  selector: 'app-drivers-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="DRIVER"
      roleTitle="Driver"
      roleIcon="directions_car"
      roleDescription="Manage and view all registered logistics and vehicle Drivers."
    ></app-user-list>
  `
})
export class DriversPageComponent {}

@Component({
  selector: 'app-cooks-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="COOK"
      roleTitle="Cook"
      roleIcon="restaurant"
      roleDescription="Manage and view all registered head Kitchen Cooks."
    ></app-user-list>
  `
})
export class CooksPageComponent {}

@Component({
  selector: 'app-assistant-cooks-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="ASSISTANT_COOK"
      roleTitle="Assistant Cook"
      roleIcon="soup_kitchen"
      roleDescription="Manage and view all registered Assistant Cooks and kitchen staff."
    ></app-user-list>
  `
})
export class AssistantCooksPageComponent {}

@Component({
  selector: 'app-public-relations-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="PUBLIC_RELATIONS"
      roleTitle="Public Relations"
      roleIcon="campaign"
      roleDescription="Manage and view all registered Public Relations (PR) officers."
    ></app-user-list>
  `
})
export class PublicRelationsPageComponent {}

@Component({
  selector: 'app-counselors-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="COUNSELOR"
      roleTitle="Counselor"
      roleIcon="psychology"
      roleDescription="Manage and view all registered student and employee Counselors."
    ></app-user-list>
  `
})
export class CounselorsPageComponent {}

@Component({
  selector: 'app-superintendents-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="SUPERINTENDENT"
      roleTitle="Superintendent"
      roleIcon="badge"
      roleDescription="Manage and view all registered facility Superintendents."
    ></app-user-list>
  `
})
export class SuperintendentsPageComponent {}

@Component({
  selector: 'app-admins-page',
  standalone: true,
  imports: [UserListComponent],
  template: `
    <app-user-list
      roleCode="ADMIN"
      roleTitle="Admin"
      roleIcon="admin_panel_settings"
      roleDescription="Manage and view all Admin users."
    ></app-user-list>
  `
})
export class AdminsPageComponent {}
