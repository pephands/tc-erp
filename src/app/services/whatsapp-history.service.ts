import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

export interface WhatsappHistoryRecord {
  id: number;
  branch_name: string;
  tcf_name: string;
  username: string;
  name: string;
  donor_number: string;
  campaign_name: string;
  template_name: string;
  status: string;
  sent_at: string;
}

export interface WhatsappHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WhatsappHistoryRecord[];
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappHistoryService extends BaseHttpService {
  constructor(
    public endPoint: Endpoint,
    public injector: Injector,
  ) {
    super(injector);
  }

  get isAuthenticatedEndpoint(): boolean {
    return true;
  }

  get endpoint(): string {
    return this.endPoint.whatsappHistory;
  }

  getHistory(page: number = 1, filters?: any): Observable<any> {
    let queryParams: any = { page };
    if (filters) {
      if (filters.status) queryParams.status = filters.status;
      if (filters.campaign_name) queryParams.campaign_name = filters.campaign_name;
      if (filters.branch) queryParams.branch = filters.branch;
      if (filters.start_date) queryParams.start_date = filters.start_date;
      if (filters.end_date) queryParams.end_date = filters.end_date;
    }
    
    return this.httpGetMethod(queryParams);
  }

  exportHistory(filters?: any): Observable<any> {
    let queryParams: any = {};
    if (filters) {
      if (filters.status) queryParams.status = filters.status;
      if (filters.campaign_name) queryParams.campaign_name = filters.campaign_name;
      if (filters.branch) queryParams.branch = filters.branch;
      if (filters.start_date) queryParams.start_date = filters.start_date;
      if (filters.end_date) queryParams.end_date = filters.end_date;
    }
    
    return this.httpClient.get(this.endPoint.whatsappHistoryExport, {
      headers: this.headers,
      params: queryParams,
      responseType: 'blob',
      observe: 'response'
    });
  }
}
