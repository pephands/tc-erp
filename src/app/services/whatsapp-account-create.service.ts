import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class WhatsappAccountCreateService extends BaseHttpService {
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

  postData(data: any): Observable<any> {
    return this.httpPostMethod(data);
  }

  putData(id: number, data: any): Observable<any> {
    return this.httpPutMethod(id, data);
  }
}
