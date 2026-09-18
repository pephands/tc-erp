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

  getCampaigns(): Observable<any> {
    return this.httpGetMethod({ is_active: 'all', page_size: 10 });
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

  getAccounts(): Observable<any> {
    return this.httpGetMethod({ page_size: 10 });
  }
}
