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

  getData(): Observable<any> {
    return this.httpGetMethod();
  }
}
