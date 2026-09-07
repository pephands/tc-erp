import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BranchesComponent } from './components/branches/branches.component';
import { ManagersComponent } from './components/managers/managers.component';
import { TelecallersComponent } from './components/telecallers/telecallers.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { ApproveAssignComponent } from './components/approve-assign/approve-assign.component';
import { BranchDocumentsComponent } from './components/branch-documents/branch-documents.component';
import { authGuard, loginGuard } from './guards/auth.guard';
import { deviceAuthGuard } from './guards/device-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'branches',
        component: BranchesComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: 'managers',
        component: ManagersComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: 'telecallers',
        component: TelecallersComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: 'attendance',
        component: AttendanceComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: 'approve-assign',
        component: ApproveAssignComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: 'branch-documents',
        component: BranchDocumentsComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
