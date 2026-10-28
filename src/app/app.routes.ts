import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BranchesComponent } from './components/branches/branches.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { ApproveAssignComponent } from './components/approve-assign/approve-assign.component';
import { TlDataManagementComponent } from './components/tl-data-management/tl-data-management.component';
import { BranchDocumentsComponent } from './components/branch-documents/branch-documents.component';
import { BranchVehiclesComponent } from './components/branch-vehicles/branch-vehicles.component';
import { BranchSettingsComponent } from './components/branch-settings/branch-settings.component';
import { TrustChildrenComponent } from './components/trust-children/trust-children.component';
import { ExpenseDetailsComponent } from './components/expense-details/expense-details.component';
import { ExpenseReportComponent } from './components/expense-report/expense-report.component';
import { WhatsappCampaignsComponent } from './components/whatsapp-campaigns/whatsapp-campaigns.component';
import { WhatsappAccountsComponent } from './components/whatsapp-accounts/whatsapp-accounts.component';
import { WhatsappTemplates } from './components/whatsapp-templates/whatsapp-templates.component';
import { WhatsappSendComponent } from './components/whatsapp-send/whatsapp-send.component';
import { WhatsappHistoryComponent } from './components/whatsapp-history/whatsapp-history.component';
import { WhatsappReceiptSettings } from './components/whatsapp-receipt-settings/whatsapp-receipt-settings';

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
import { UnclaimedRecordsComponent } from './components/unclaimed-records/unclaimed-records.component';
import { ReceiptListComponent } from './components/receipts/receipt-list/receipt-list.component';
import { TrustReceiptsComponent } from './components/receipts/trust-receipts/trust-receipts.component';
import { ReceiptCreateComponent } from './components/receipts/receipt-create/receipt-create.component';
import { BatchReceiptsComponent } from './components/receipts/batch-receipts/batch-receipts.component';

import {
  AllUsersPageComponent,
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
  TrustUsersPageComponent,
  OutreachTeamPageComponent,
  DistrictCoordinatorPageComponent,
  TuitionTeacherPageComponent,
} from './components/role-users/role-user-pages.component';

import { UserSettingsComponent } from './components/user-settings/user-settings.component';

import { authGuard, loginGuard, roleGuard } from './guards/auth.guard';
import { deviceAuthGuard } from './guards/device-auth.guard';

import { ReferenceLeadsComponent } from './components/reference-leads/reference-leads.component';
import { AnnouncementManagementComponent } from './components/announcement-management/announcement-management.component';
import { FoodBookingCalendarComponent } from './components/food-booking-calendar/food-booking-calendar.component';
import { OccasionsComponent } from './components/occasions/occasions.component';

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
        path: 'reference-leads',
        component: ReferenceLeadsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'TC'])],
        title: 'Reference Leads',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'branches',
        component: BranchesComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'announcements',
        component: AnnouncementManagementComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'TC', 'OT'])],
      },
      // --- Users Module Routes ---
      {
        path: 'users/admin',
        component: AdminsPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/all',
        component: AllUsersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/telecaller',
        component: TelecallersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'MANAGER', 'TL'])],
      },
      {
        path: 'users/team-leader',
        component: TeamLeadersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'MANAGER'])],
      },
      {
        path: 'users/manager',
        component: ManagersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/backend',
        component: BackendUsersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/driver',
        component: DriversPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/cook',
        component: CooksPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/assistant-cook',
        component: AssistantCooksPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/public-relations',
        component: PublicRelationsPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/counselor',
        component: CounselorsPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/superintendent',
        component: SuperintendentsPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/trust-users',
        component: TrustUsersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'SUPERINTENDENT'])],
      },
      {
        path: 'users/outreach-team/district-coordinator',
        component: DistrictCoordinatorPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/outreach-team/tuition-teacher',
        component: TuitionTeacherPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'users/outreach-team',
        redirectTo: 'users/outreach-team/district-coordinator',
        pathMatch: 'full',
      },
      {
        path: 'users/settings',
        component: UserSettingsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },

      // Legacy Route Aliases for backwards compatibility
      {
        path: 'managers',
        component: ManagersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'telecallers',
        component: TelecallersPageComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'MANAGER', 'TL'])],
      },

      // Operations & Features
      {
        path: 'attendance',
        component: AttendanceComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'MANAGER', 'TL', 'TC', 'SUPERINTENDENT', 'PUBLIC_RELATIONS', 'OT', 'TCT'])],
      },
      {
        path: 'approve-assign',
        component: ApproveAssignComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'tl-data-management',
        component: TlDataManagementComponent,
        canActivate: [deviceAuthGuard, roleGuard(['TL'])],
      },
      {
        path: 'workstation',
        component: WorkstationComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'TC'])],
      },
      {
        path: 'branch-documents',
        component: BranchDocumentsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'PUBLIC_RELATIONS', 'SUPERINTENDENT'])],
      },
      {
        path: 'branch-vehicles',
        component: BranchVehiclesComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'SUPERINTENDENT', 'MANAGER'])],
      },
      {
        path: 'branch-settings',
        component: BranchSettingsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'expense-details',
        component: ExpenseDetailsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'PUBLIC_RELATIONS', 'SUPERINTENDENT'])],
      },
      {
        path: 'expense-report',
        component: ExpenseReportComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'send-records',
        component: SendRecordsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['TC', 'TL'])],
      },
      {
        path: 'received-records',
        component: ReceivedRecordsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL'])],
      },
      {
        path: 'approved-records',
        component: ApprovedRecordsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'OT', 'ONLINE PAYMENT TEAM', 'TC'])],
      },
      {
        path: 'live-batch',
        component: LiveBatchComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'MANAGER', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'batch-reports',
        component: BatchReportsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'batch-settings',
        component: BatchSettingsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'received-status',
        component: ReceivedStatusComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL'])],
      },
      {
        path: 'online-history',
        component: OnlineHistoryComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'OT', 'ONLINE PAYMENT TEAM', 'TC'])],
      },
      {
        path: 'verified-donors',
        component: VerifiedDonorsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'unclaimed-records',
        component: UnclaimedRecordsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'whatsapp-receipt-settings',
        component: WhatsappReceiptSettings,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'whatsapp-accounts',
        component: WhatsappAccountsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'whatsapp-campaigns',
        component: WhatsappCampaignsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'whatsapp-campaigns/:campaignId/templates',
        component: WhatsappTemplates,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'whatsapp-send',
        component: WhatsappSendComponent,
        canActivate: [deviceAuthGuard, roleGuard(['TL', 'TC'])],
      },
      {
        path: 'whatsapp-history',
        component: WhatsappHistoryComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'TC'])],
      },
      {
        path: 'feedbacks',
        component: FeedbacksComponent,
        canActivate: [deviceAuthGuard, roleGuard(['TC'])],
      },
      {
        path: 'feedback-details',
        component: FeedbackDetailsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
      },
      {
        path: 'receipts/view',
        component: ReceiptListComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TL', 'TC', 'TCT', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'receipts/trust-receipts',
        component: TrustReceiptsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'OT', 'ONLINE PAYMENT TEAM', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER'])],
      },
      {
        path: 'receipts/batch-receipts',
        component: BatchReceiptsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'TCT', 'OT', 'ONLINE PAYMENT TEAM'])],
      },
      {
        path: 'receipts/create',
        component: ReceiptCreateComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'ADMINISTRATOR', 'PUBLIC_RELATIONS', 'PUBLIC RELATIONSHIP OFFICER', 'SUPERINTENDENT'])],
      },
      {
        path: 'trust-children',
        component: TrustChildrenComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'SUPERINTENDENT'])],
      },
      {
        path: 'food-calendar',
        component: FoodBookingCalendarComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN', 'MANAGER', 'TL', 'PUBLIC_RELATIONS'])],
        title: 'Food Booking Calendar',
      },
      {
        path: 'occasions',
        component: OccasionsComponent,
        canActivate: [deviceAuthGuard, roleGuard(['ADMIN'])],
        title: 'Occasions Setup',
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
