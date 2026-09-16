import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BranchesComponent } from './components/branches/branches.component';
import { ManagersComponent } from './components/managers/managers.component';
import { TelecallersComponent } from './components/telecallers/telecallers.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { ApproveAssignComponent } from './components/approve-assign/approve-assign.component';
import { TlDataManagementComponent } from './components/tl-data-management/tl-data-management.component';
import { BranchDocumentsComponent } from './components/branch-documents/branch-documents.component';
import { ExpenseDetailsComponent } from './components/expense-details/expense-details.component';
import { ExpenseReportComponent } from './components/expense-report/expense-report.component';
import { SendRecordsComponent } from './components/send-records/send-records.component';
import { ApprovedRecordsComponent } from './components/approved-records/approved-records.component';
import { TelecallerWorkstationComponent } from './components/telecaller-workstation/telecaller-workstation.component';
import { authGuard, loginGuard } from './guards/auth.guard';
import { deviceAuthGuard } from './guards/device-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'branches',
        component: BranchesComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'managers',
        component: ManagersComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'telecallers',
        component: TelecallersComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'attendance',
        component: AttendanceComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'approve-assign',
        component: ApproveAssignComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'tl-data-management',
        component: TlDataManagementComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'workstation',
        component: TelecallerWorkstationComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'work-details',
        component: TelecallerWorkstationComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'branch-documents',
        component: BranchDocumentsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'expense-details',
        component: ExpenseDetailsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'expense-report',
        component: ExpenseReportComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'send-records',
        component: SendRecordsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'approved-records',
        component: ApprovedRecordsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
