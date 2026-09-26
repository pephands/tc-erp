import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root',
})
export class BranchListService extends BaseHttpService {
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
    return this.endPoint.branches;
  }

  getData(page: number = 1, pageSize: number = 10, search?: string, isActive?: string, isTrust?: string): Observable<any> {
    let url = `${this.endpoint}?page=${page}&page_size=${pageSize}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (isActive) url += `is_active=${encodeURIComponent(isActive)}&`;
    if (isTrust) url += `is_trust=${encodeURIComponent(isTrust)}&`;
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    return this.httpClient.get(url, { headers: this.headers });
  }

  exportData(search?: string, isActive?: string): Observable<Blob> {
    let url = `${this.endpoint}export/?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (isActive) url += `is_active=${encodeURIComponent(isActive)}&`;
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    return this.httpClient.get(url, { headers: this.headers, responseType: 'blob' });
  }
}
