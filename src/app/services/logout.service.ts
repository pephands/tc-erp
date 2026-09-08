import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root',
})
export class LogoutService extends BaseHttpService {
  constructor(
    public endPoint: Endpoint,
    public injector: Injector,
  ) {
    super(injector);
  }

  get isAuthenticatedEndpoint(): boolean {
    return true; // Logout requires authentication
  }

  get endpoint(): string {
    return this.endPoint.logout;
  }

  getData(params?: any): Observable<object> {
    return this.httpPostMethod(params);
  }
}
