import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class WhatsappTemplateService extends BaseHttpService {
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
    return this.endPoint.whatsappTemplates;
  }

  getTemplates(campaignId?: number, isActive?: boolean, templateType?: string): Observable<any> {
    let url = this.endpoint + '?';
    if (campaignId) url += `campaign=${campaignId}&`;
    if (isActive !== undefined) url += `is_active=${isActive}&`;
    if (templateType) url += `template_type=${templateType}&`;
    return this.httpClient.get(url, { headers: this.headers });
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
