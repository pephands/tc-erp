import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

export interface TrustChildRecord {
  id: number;
  children_name: string;
  trust_name: number;
  trust_branch_name: string;
  license_no: string;
  mobile_number: string;
  gender: string;
  category: string;
  aadhar_no: string;
  date_of_joining: string;
  discharge_date: string | null;
  address: string;
  parent_details: string;
  document: string | null;
  file_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class TrustChildrenService extends BaseHttpService {
  private childrenSignal = signal<TrustChildRecord[]>([]);

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
    return this.endPoint.trustChildren;
  }

  getChildren() {
    return this.childrenSignal.asReadonly();
  }

  fetchChildren(filters: any = {}): Observable<any> {
    const params: any = { ...filters };

    return this.httpGetMethod(params).pipe(
      map((res: any) => {
        let items: any[] = [];
        if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }
        this.childrenSignal.set(items);
        return res; // Return the entire response to access 'count'
      })
    );
  }

  createChild(formData: FormData): Observable<any> {
    return this.httpPostMultipartMethod(formData);
  }

  updateChild(id: number, formData: FormData): Observable<any> {
    return this.httpPutMultipartMethod(id, formData);
  }

  deleteChild(id: number): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.delete(url, { headers: this.headers });
  }
}
