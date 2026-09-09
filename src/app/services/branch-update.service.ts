import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root',
})
export class BranchUpdateService extends BaseHttpService {
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

  putData(id: number | string, payload: any): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.put(url, payload, { headers: this.headers });
  }

  patchData(id: number | string, payload: any): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.patch(url, payload, { headers: this.headers });
  }
}
