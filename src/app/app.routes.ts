import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BranchesComponent } from './components/branches/branches.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { ApproveAssignComponent } from './components/approve-assign/approve-assign.component';
import { TlDataManagementComponent } from './components/tl-data-management/tl-data-management.component';
import { BranchDocumentsComponent } from './components/branch-documents/branch-documents.component';
import { ExpenseDetailsComponent } from './components/expense-details/expense-details.component';
import { ExpenseReportComponent } from './components/expense-report/expense-report.component';
import { WhatsappCampaignsComponent } from './components/whatsapp-campaigns/whatsapp-campaigns.component';
import { WhatsappAccountsComponent } from './components/whatsapp-accounts/whatsapp-accounts.component';
import { WhatsappTemplates } from './components/whatsapp-templates/whatsapp-templates.component';
import { WhatsappSendComponent } from './components/whatsapp-send/whatsapp-send.component';
import { WhatsappHistoryComponent } from './components/whatsapp-history/whatsapp-history.component';

import { BatchReportsComponent } from './components/batch-reports/batch-reports.component';
import { BatchSettingsComponent } from './components/batch-settings/batch-settings.component';
import { ReceivedStatusComponent } from './components/received-status/received-status.component';
import { OnlineHistoryComponent } from './components/online-history/online-history.component';
import { LiveBatchComponent } from './components/live-batch/live-batch.component';

import { SendRecordsComponent } from './components/send-records/send-records.component';
import { ReceivedRecordsComponent } from './components/received-records/received-records.component';
import { ApprovedRecordsComponent } from './components/approved-records/approved-records.component';
import { WorkstationComponent } from './components/workstation/workstation.component';
import { FeedbacksComponent } from './components/feedbacks/feedbacks.component';
import { FeedbackDetailsComponent } from './components/feedback-details/feedback-details.component';
import { VerifiedDonorsComponent } from './components/verified-donors/verified-donors.component';
import { ReceiptListComponent } from './components/receipts/receipt-list/receipt-list.component';
import { ReceiptCreateComponent } from './components/receipts/receipt-create/receipt-create.component';

import {
  TelecallersPageComponent,
  TeamLeadersPageComponent,
  ManagersPageComponent,
  BackendUsersPageComponent,
  DriversPageComponent,
  CooksPageComponent,
  AssistantCooksPageComponent,
  PublicRelationsPageComponent,
  CounselorsPageComponent,
  SuperintendentsPageComponent,
  AdminsPageComponent,
} from './components/role-users/role-user-pages.component';

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
      // --- Users Module Routes ---
      {
        path: 'users/admin',
        component: AdminsPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/telecaller',
        component: TelecallersPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/team-leader',
        component: TeamLeadersPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/manager',
        component: ManagersPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/backend',
        component: BackendUsersPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/driver',
        component: DriversPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/cook',
        component: CooksPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/assistant-cook',
        component: AssistantCooksPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/public-relations',
        component: PublicRelationsPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/counselor',
        component: CounselorsPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'users/superintendent',
        component: SuperintendentsPageComponent,
        canActivate: [deviceAuthGuard],
      },

      // Legacy Route Aliases for backwards compatibility
      {
        path: 'managers',
        component: ManagersPageComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'telecallers',
        component: TelecallersPageComponent,
        canActivate: [deviceAuthGuard],
      },

      // Operations & Features
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
        component: WorkstationComponent,
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
        path: 'received-records',
        component: ReceivedRecordsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'approved-records',
        component: ApprovedRecordsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'live-batch',
        component: LiveBatchComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'batch-reports',
        component: BatchReportsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'batch-settings',
        component: BatchSettingsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'received-status',
        component: ReceivedStatusComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'online-history',
        component: OnlineHistoryComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'verified-donors',
        component: VerifiedDonorsComponent,
        canActivate: [deviceAuthGuard]
      },
      {
        path: 'whatsapp-accounts',
        component: WhatsappAccountsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'whatsapp-campaigns',
        component: WhatsappCampaignsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'whatsapp-campaigns/:campaignId/templates',
        component: WhatsappTemplates,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'whatsapp-send',
        component: WhatsappSendComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'whatsapp-history',
        component: WhatsappHistoryComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'feedbacks',
        component: FeedbacksComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'feedback-details',
        component: FeedbackDetailsComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'receipts/view',
        component: ReceiptListComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'receipts/create',
        component: ReceiptCreateComponent,
        canActivate: [deviceAuthGuard],
      },
      {
        path: 'trust-children',
        loadComponent: () => import('./components/trust-children/trust-children.component').then(m => m.TrustChildrenComponent),
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
