import { Injectable, Injector, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Endpoint } from '../http/endpoint';
import { BaseHttpService } from '../http/baseHttp';

@Injectable({
  providedIn: 'root',
})
export class PaymentService extends BaseHttpService {
  private endPoint = inject(Endpoint);

  get isAuthenticatedEndpoint(): boolean {
    return true;
  }

  get endpoint(): string {
    return this.endPoint.paymentRecords;
  }

  constructor(injector: Injector) {
    super(injector);
  }

  getRecords(
    status: string = '',
    search: string = '',
    startDate: string = '',
    endDate: string = '',
    page: number = 1,
    excludeStatus: string = '',
    unbatchedOnly: boolean = false
  ): Observable<any> {
    let params = new HttpParams().set('page', page.toString());
    if (status) {
      params = params.set('status', status);
    }
    if (excludeStatus) {
      params = params.set('exclude_status', excludeStatus);
    }
    if (unbatchedOnly) {
      params = params.set('unbatched', 'true');
    }
    if (search) {
      params = params.set('search', search);
    }
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }

    return this.httpClient.get<any>(this.endpoint, {
      headers: this.headers,
      params,
    });
  }

  createOnlinePayment(formData: FormData): Observable<any> {
    return this.httpClient.post<any>(this.endpoint, formData, {
      headers: this.multipartHeaders,
    });
  }

  getBatchReports(startDate: string = '', endDate: string = '', status: string = ''): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (status) params = params.set('batch_status', status);
    
    return this.httpClient.get<any>(this.endPoint.paymentBatchReport, {
      headers: this.headers,
      params,
    });
  }

  getBatchBranchStats(runId: number): Observable<any> {
    return this.httpClient.get<any>(this.endPoint.paymentBatchBranchStats(runId), {
      headers: this.headers,
    });
  }

  getBatchRecords(runId: number): Observable<any> {
    return this.httpClient.get<any>(this.endPoint.paymentBatchRecords(runId), {
      headers: this.headers,
    });
  }

  downloadBatchReport(runId: number): Observable<Blob> {
    return this.httpClient.get(`${this.endPoint.paymentBatchReport}?export=true&run_id=${runId}`, {
      headers: this.headers,
      responseType: 'blob'
    });
  }

  uploadBatchFile(formData: FormData): Observable<any> {
    return this.httpClient.post<any>(this.endPoint.paymentBatchUpload, formData, {
      headers: this.multipartHeaders,
    });
  }

  updateOnlinePayment(id: number | string, formData: FormData): Observable<any> {
    return this.httpClient.patch<any>(`${this.endpoint}${id}/`, formData, {
      headers: this.multipartHeaders,
    });
  }

  // Batch Configs
  getBatchConfigs(): Observable<any> {
    return this.httpClient.get<any>(this.endPoint.paymentBatchConfigs, {
      headers: this.headers,
    });
  }

  createBatchConfig(data: any): Observable<any> {
    return this.httpClient.post<any>(this.endPoint.paymentBatchConfigs, data, {
      headers: this.headers,
    });
  }

  updateBatchConfig(id: number | string, data: any): Observable<any> {
    return this.httpClient.patch<any>(`${this.endPoint.paymentBatchConfigs}${id}/`, data, {
      headers: this.headers,
    });
  }

  // Payment Modes
  getPaymentModes(isActiveOnly: boolean = true): Observable<any> {
    let params = new HttpParams();
    if (isActiveOnly) {
      params = params.set('is_active', 'true');
    }
    return this.httpClient.get<any>(this.endPoint.paymentModes, {
      headers: this.headers,
      params
    });
  }

  createPaymentMode(data: any): Observable<any> {
    return this.httpClient.post<any>(this.endPoint.paymentModes, data, {
      headers: this.headers,
    });
  }

  updatePaymentMode(id: number | string, data: any): Observable<any> {
    return this.httpClient.patch<any>(`${this.endPoint.paymentModes}${id}/`, data, {
      headers: this.headers,
    });
  }

  getReceiptUrl(id: number | string): string {
    return this.endPoint.paymentRecordReceipt(Number(id));
  }

  downloadReceipt(id: number | string): Observable<Blob> {
    return this.httpClient.get(this.endPoint.paymentRecordReceipt(Number(id)), {
      headers: this.headers,
      responseType: 'blob',
    });
  }
}
