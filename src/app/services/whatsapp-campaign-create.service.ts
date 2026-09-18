import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class WhatsappCampaignCreateService extends BaseHttpService {
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

  postData(data: any): Observable<any> {
    return this.httpPostMultipartMethod(data);
  }

  putData(id: number, data: any): Observable<any> {
    return this.httpPutMultipartMethod(id, data);
  }

  deleteData(id: number): Observable<any> {
    const ENDAPI = this.endpoint + id + '/';
    return this.httpClient.delete(ENDAPI, { headers: this.headers });
  }

  triggerTest(id: number, number: string): Observable<any> {
    const ENDAPI = this.endpoint + id + '/test/';
    return this.httpClient.post(ENDAPI, { number }, { headers: this.headers });
  }
}
