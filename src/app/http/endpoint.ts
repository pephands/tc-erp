import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Endpoint {
  baseUrl: string = 'http://127.0.0.1:8000/';
  // baseUrl: string = 'https://f428-183-82-242-159.ngrok-free.app/';

  // user authentication

  get login(): string {
    return this.baseUrl + 'accounts/login/';
  }

  get logout(): string {
    return this.baseUrl + 'accounts/logout/';
  }

  get users(): string {
    return this.baseUrl + 'accounts/users/';
  }

  get me(): string {
    return this.baseUrl + 'accounts/me/';
  }

  get telecallers(): string {
    return this.baseUrl + 'accounts/users/?role=TC&is_active=true&page_size=1000';
  }

  get changePassword(): string {
    return this.baseUrl + 'accounts/change-password/';
  }

  // Branches
  get branches(): string {
    return this.baseUrl + 'branches/';
  }

  get branchDocuments(): string {
    return this.baseUrl + 'branches/documents/';
  }

  get branchExpenses(): string {
    return this.baseUrl + 'branches/expenses/';
  }

  get branchExpenseExport(): string {
    return this.baseUrl + 'branches/expenses/export/';
  }

  get branchExpenseSummary(): string {
    return this.baseUrl + 'branches/expenses/summary/';
  }



  // Attendance Check-In / Check-Out
  get attendanceCheckIn(): string {
    return this.baseUrl + 'attendance/check-in/';
  }

  get attendanceCheckOut(): string {
    return this.baseUrl + 'attendance/check-out/';
  }

  get attendanceToday(): string {
    return this.baseUrl + 'attendance/today/';
  }

  get attendanceList(): string {
    return this.baseUrl + 'attendance/';
  }

  get attendanceExport(): string {
    return this.baseUrl + 'attendance/export/';
  }

  get wfhPasscode(): string {
    return this.baseUrl + 'attendance/wfh-passcode/';
  }

  get wfhRequest(): string {
    return this.baseUrl + 'attendance/wfh-request/';
  }

  get dashboardSummary(): string {
    return this.baseUrl + 'dashboard/';
  }

  // Telecalling Domain
  get telecallingUpload(): string {
    return this.baseUrl + 'telecalling/upload/';
  }

  get telecallingMasterSummary(): string {
    return this.baseUrl + 'telecalling/master-summary/';
  }

  get telecallingUnallocatedExport(): string {
    return this.baseUrl + 'telecalling/unallocated/export/';
  }

  get telecallingUnallocatedFlush(): string {
    return this.baseUrl + 'telecalling/unallocated/flush/';
  }

  get telecallingRequests(): string {
    return this.baseUrl + 'telecalling/requests/';
  }

  get telecallingBranchPool(): string {
    return this.baseUrl + 'telecalling/branch-pool/';
  }

  get telecallingAssignTc(): string {
    return this.baseUrl + 'telecalling/assign-tc/';
  }

  get telecallingTcQueue(): string {
    return this.baseUrl + 'telecalling/tc-queue/';
  }

  get telecallingCallLog(): string {
    return this.baseUrl + 'telecalling/call-log/';
  }
  get telecallingAllocationHistory(): string {
    return this.baseUrl + 'telecalling/allocations/history/';
  }
  get telecallingAllocationSummary(): string {
    return this.baseUrl + 'telecalling/allocations/summary/';
  }

  telecallingAllocatedBases(telecallerId: number): string {
    return this.baseUrl + `telecalling/allocations/tc-bases/${telecallerId}/`;
  }

  telecallingAllocationBatchPdf(batchId: number): string {
    return this.baseUrl + `telecalling/allocations/batch/${batchId}/pdf/`;
  }

  telecallingAllocationBatchExcel(batchId: number): string {
    return this.baseUrl + `telecalling/allocations/batch/${batchId}/excel/`;
  }

  // Payments Domain
  get paymentRecords(): string {
    return this.baseUrl + 'payments/records/';
  }
  
  get paymentModes(): string {
    return this.baseUrl + 'payments/modes/';
  }
  
  get paymentBatchConfigs(): string {
    return this.baseUrl + 'payments/batch-configs/';
  }

  get paymentBatchTrigger(): string {
    return this.baseUrl + 'payments/batch/trigger/';
  }

  get paymentBatchReport(): string {
    return this.baseUrl + 'payments/batch/report/';
  }

  get paymentBatchUpload(): string {
    return this.baseUrl + 'payments/batch/upload/';
  }
  
  paymentBatchBranchStats(runId: number): string {
    return this.baseUrl + `payments/batch/${runId}/branch-stats/`;
  }
  
  paymentBatchRecords(runId: number): string {
    return this.baseUrl + `payments/batch/${runId}/records/`;
  }

  paymentRecordReceipt(id: number): string {
    return this.baseUrl + `payments/records/${id}/receipt/`;
  }

  get verifiedDonorsUpload(): string {
    return this.baseUrl + 'payments/verified-donors/upload/';
  }

  get verifiedDonors(): string {
    return this.baseUrl + 'payments/verified-donors/';
  }

  get verifiedDonorsCheck(): string {
    return this.baseUrl + 'payments/verified-donors/check/';
  }

  get verifiedDonorsForceDelete(): string {
    return this.baseUrl + 'payments/verified-donors/force-delete/';
  }

  // Whatsapp
  get whatsappAccounts(): string {
    return this.baseUrl + 'whatsapp/accounts/';
  }

  get whatsappCampaigns(): string {
    return this.baseUrl + 'whatsapp/campaigns/';
  }

  get whatsappTemplates(): string {
    return this.baseUrl + 'whatsapp/templates/';
  }

  // Internal Feedback Domain
  get feedbacks(): string {
    return this.baseUrl + 'internal/feedbacks/';
  }

  feedbackResolve(id: number): string {
    return this.baseUrl + `internal/feedbacks/${id}/resolve/`;
  }
}
