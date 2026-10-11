import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class WhatsappCampaignService extends BaseHttpService {
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
    return this.endPoint.whatsappCampaigns;
  }

  getCampaigns(params?: any): Observable<any> {
    return this.httpGetMethod({ is_active: 'all', page_size: 1000, ...params });
  }
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappAccountService extends BaseHttpService {
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
    return this.endPoint.whatsappAccounts;
  }

  getAccounts(params?: any): Observable<any> {
    return this.httpGetMethod({ page_size: 1000, ...params });
  }
}
