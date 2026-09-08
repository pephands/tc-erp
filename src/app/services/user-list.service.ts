import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root',
})
export class UserListService extends BaseHttpService {
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
    return this.endPoint.users;
  }

  getUsers(branchId?: number | null, roleCode?: string | null): Observable<any> {
    let url = this.endpoint + '?';
    if (branchId) url += `branch=${branchId}&`;
    if (roleCode) url += `role=${roleCode}&`;
    
    // Remove trailing '?' or '&'
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;

    return this.httpClient.get(url, { headers: this.headers });
  }
}
