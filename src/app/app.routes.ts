import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BranchesComponent } from './components/branches/branches.component';
import { ManagersComponent } from './components/managers/managers.component';
import { TelecallersComponent } from './components/telecallers/telecallers.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { authGuard, loginGuard } from './guards/auth.guard';

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
        component: BranchesComponent
      },
      {
        path: 'managers',
        component: ManagersComponent
      },
      {
        path: 'telecallers',
        component: TelecallersComponent
      },
      {
        path: 'attendance',
        component: AttendanceComponent
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
