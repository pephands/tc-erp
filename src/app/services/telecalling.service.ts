import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';
import {
  MasterDonorRecord,
  BranchAllocationRequestRecord,
  MasterSummaryData,
  BranchPoolData,
  TelecallerUserOption,
  deserializeMasterDonor,
  deserializeAllocationRequest,
} from '../models/telecalling.model';

@Injectable({
  providedIn: 'root',
})
export class TelecallingService extends BaseHttpService {
  public tcQueueSignal = signal<MasterDonorRecord[]>([]);

  constructor(
    public endPoint: Endpoint,
    public injector: Injector
  ) {
    super(injector);
  }

  get isAuthenticatedEndpoint(): boolean {
    return true;
  }

  get endpoint(): string {
    return this.endPoint.telecallingRequests;
  }

  uploadExcel(file: File, category: string = 'BASE'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.httpClient.post(this.endPoint.telecallingUpload, formData, {
      headers: this.multipartHeaders,
    });
  }

  downloadSampleTemplate(): Observable<Blob> {
    const url = `${this.endPoint.baseUrl}accounts/users/sample-template/?role=telecalling_data`;
    return this.httpClient.get(url, {
      headers: this.headers,
      responseType: 'blob',
    });
  }

  fetchMasterSummary(): Observable<any> {
    return this.httpClient.get(this.endPoint.telecallingMasterSummary, {
      headers: this.headers,
    });
  }

  exportUnallocatedExcel(category: string = 'ALL'): Observable<Blob> {
    return this.httpClient.get(this.endPoint.telecallingUnallocatedExport, {
      headers: this.headers,
      params: { category },
      responseType: 'blob',
    });
  }

  flushUnallocated(category: string = 'ALL'): Observable<any> {
    return this.httpClient.post(
      this.endPoint.telecallingUnallocatedFlush,
      { category },
      { headers: this.headers }
    );
  }

  fetchAllocationRequests(params?: any): Observable<any> {
    return this.httpClient
      .get(this.endPoint.telecallingRequests, { headers: this.headers, params })
      .pipe(
        map((res: any) => {
          let items: any[] = [];
          let count = 0;
          if (res && res.results) {
            items = res.results;
            count = res.count || items.length;
          } else if (res && res.status === 'success' && res.data) {
            items = Array.isArray(res.data) ? res.data : [res.data];
            count = items.length;
          } else if (Array.isArray(res)) {
            items = res;
            count = items.length;
          }
          return {
            count,
            results: items.map((item: any) => deserializeAllocationRequest(item))
          };
        })
      );
  }

  createAllocationRequest(category: string, quantity: number, branchId?: number, autoApprove: boolean = false): Observable<any> {
    const payload: any = { category, requested_quantity: quantity };
    if (branchId) payload.branch = branchId;
    if (autoApprove) payload.auto_approve = true;

    return this.httpClient.post(this.endPoint.telecallingRequests, payload, {
      headers: this.headers,
    });
  }

  approveAllocationRequest(requestId: number): Observable<any> {
    const url = `${this.endPoint.telecallingRequests}${requestId}/approve/`;
    return this.httpClient.post(url, {}, { headers: this.headers });
  }

  rejectAllocationRequest(requestId: number): Observable<any> {
    const url = `${this.endPoint.telecallingRequests}${requestId}/reject/`;
    return this.httpClient.post(url, {}, { headers: this.headers });
  }

  fetchBranchPool(branchId?: number): Observable<any> {
    const params: any = {};
    if (branchId) params.branch = branchId;

    return this.httpClient.get(this.endPoint.telecallingBranchPool, {
      headers: this.headers,
      params,
    });
  }

  assignToTelecaller(
    telecallerIds: number[] | number,
    category: string,
    count: number,
    branchId?: number
  ): Observable<any> {
    const ids = Array.isArray(telecallerIds) ? telecallerIds : [telecallerIds];
    const payload: any = {
      telecaller_ids: ids,
      category,
      count,
    };
    if (branchId) payload.branch = branchId;

    return this.httpClient.post(this.endPoint.telecallingAssignTc, payload, {
      headers: this.headers,
    });
  }

  fetchTcQueue(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    queueType: string = 'pending'
  ): Observable<{ records: MasterDonorRecord[]; totalCount: number; totalPages: number }> {
    const params: any = { page, page_size: pageSize, queue_type: queueType };
    if (search) params.search = search;

    return this.httpClient
      .get(this.endPoint.telecallingWorkstation, {
        headers: this.headers,
        params,
      })
      .pipe(
        map((res: any) => {
          let items: any[] = [];
          let totalCount = 0;
          let totalPages = 1;

          if (res && res.status === 'success') {
            items = Array.isArray(res.data) ? res.data : [];
            totalCount = res.total_count ?? items.length;
            totalPages = res.total_pages ?? 1;
          }

          const records = items.map((item: any) => deserializeMasterDonor(item));
          this.tcQueueSignal.set(records);
          return { records, totalCount, totalPages };
        })
      );
  }

  fetchAllTcQueue(search?: string, queueType: string = 'pending'): Observable<MasterDonorRecord[]> {
    const params: any = { all: 'true', queue_type: queueType };
    if (search) params.search = search;

    return this.httpClient
      .get(this.endPoint.telecallingWorkstation, {
        headers: this.headers,
        params,
      })
      .pipe(
        map((res: any) => {
          let items: any[] = [];
          if (res && res.status === 'success' && res.data) {
            items = Array.isArray(res.data) ? res.data : [res.data];
          }
          return items.map((item: any) => deserializeMasterDonor(item));
        })
      );
  }

  fetchTlWorkstation(date?: string, search?: string, branch?: string, page: number = 1): Observable<any> {
    let params: any = { page };
    if (date) params.date = date;
    if (search) params.search = search;
    if (branch) params.branch = branch;
    return this.httpClient.get<any>(this.endPoint.telecallingWorkstation, { headers: this.headers, params });
  }

  fetchTlWorkstationExport(date?: string, search?: string, branch?: string): Observable<any[]> {
    let params: any = { export: 'true' };
    if (date) params.date = date;
    if (search) params.search = search;
    if (branch) params.branch = branch;
    return this.httpClient.get<any[]>(this.endPoint.telecallingWorkstation, { headers: this.headers, params });
  }

  logCall(
    telecallingDataId: number,
    disposition: string,
    remarks?: string,
    updatedName?: string,
    updatedDob?: string
  ): Observable<any> {
    const payload: any = {
      telecalling_data_id: telecallingDataId,
      call_disposition: disposition,
      remarks: remarks || '',
      updated_donor_name: updatedName || '',
      updated_dob: updatedDob || null,
    };

    return this.httpClient.post(this.endPoint.telecallingCallLog, payload, {
      headers: this.headers,
    });
  }

  fetchTelecallers(): Observable<TelecallerUserOption[]> {
    return this.httpClient.get<any>(this.endPoint.telecallers, { headers: this.headers }).pipe(
      map((res: any) => {
        const list = res.data || res.results || (Array.isArray(res) ? res : []);
        return list.map((item: any) => ({
          id: item.id,
          employee_Id: item.employee_Id || item.email || '',
          full_name: item.full_name || item.name || item.employee_Id || '',
          branch_name: item.branch_name || item.branch?.name || '',
        }));
      })
    );
  }

  fetchBranches(params?: any): Observable<any[]> {
    return this.httpClient.get<any>(this.endPoint.branches, { headers: this.headers, params }).pipe(
      map((res: any) => {
        const list = res.data || res.results || (Array.isArray(res) ? res : []);
        return list.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code || '',
        }));
      })
    );
  }

  fetchTCAllocationHistory(params?: any): Observable<any> {
    return this.httpClient.get(this.endPoint.telecallingAllocationHistory, {
      headers: this.headers,
      params,
    });
  }

  fetchTCAllocationSummary(params?: any): Observable<any> {
    return this.httpClient.get(this.endPoint.telecallingAllocationSummary, {
      headers: this.headers,
      params,
    });
  }

  downloadTCAllocationHistory(params?: any): Observable<Blob> {
    return this.httpClient.get(this.endPoint.telecallingAllocationHistory, {
      headers: this.headers,
      params: { ...params, export: 'true' },
      responseType: 'blob'
    });
  }

  downloadTCAllocationSummary(params?: any): Observable<Blob> {
    return this.httpClient.get(this.endPoint.telecallingAllocationSummary, {
      headers: this.headers,
      params: { ...params, export: 'true' },
      responseType: 'blob'
    });
  }

  fetchTCAllocatedBases(telecallerId: number, params?: any): Observable<any> {
    const url = this.endPoint.telecallingAllocatedBases(telecallerId);
    return this.httpClient.get(url, {
      headers: this.headers,
      params,
    });
  }

  downloadTCAllocatedBases(telecallerId: number, params?: any): Observable<Blob> {
    const url = this.endPoint.telecallingAllocatedBases(telecallerId);
    return this.httpClient.get(url, {
      headers: this.headers,
      params: { ...params, export: 'true' },
      responseType: 'blob'
    });
  }

  downloadTCAllocationBatchPDF(batchId: number): Observable<Blob> {
    const url = this.endPoint.telecallingAllocationBatchPdf(batchId);
    return this.httpClient.get(url, {
      headers: this.headers,
      responseType: 'blob'
    });
  }

  downloadTCAllocationBatchExcel(batchId: number): Observable<Blob> {
    const url = this.endPoint.telecallingAllocationBatchExcel(batchId);
    return this.httpClient.get(url, {
      headers: this.headers,
      responseType: 'blob'
    });
  }

  // Call Dispositions
  getCallDispositions(isActiveOnly: boolean = true): Observable<any> {
    let params: any = {};
    if (isActiveOnly) {
      params.is_active = 'true';
    }
    return this.httpClient.get<any>(this.endPoint.telecallingCallDispositions, {
      headers: this.headers,
      params
    });
  }

  createCallDisposition(data: any): Observable<any> {
    return this.httpClient.post<any>(this.endPoint.telecallingCallDispositions, data, {
      headers: this.headers,
    });
  }

  updateCallDisposition(id: number | string, data: any): Observable<any> {
    return this.httpClient.patch<any>(`${this.endPoint.telecallingCallDispositions}${id}/`, data, {
      headers: this.headers,
    });
  }
}

