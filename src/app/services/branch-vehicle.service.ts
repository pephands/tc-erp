import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class BranchVehicleService extends BaseHttpService {
  private vehiclesSignal = signal<any[]>([]);

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
    return this.endPoint.branchVehicles;
  }

  getVehicles(filters: any = {}): Observable<any> {
    const params: any = { ...filters };

    return this.httpGetMethod(params).pipe(
      map((res: any) => {
        let items: any[] = [];
        if (res && res.results) {
          items = res.results;
        } else if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }
        this.vehiclesSignal.set(items);
        return res;
      })
    );
  }

  exportVehicles(filters: any = {}): Observable<Blob> {
    const params = new URLSearchParams(filters).toString();
    const url = `${this.endpoint}export/?${params}`;
    return this.httpClient.get(url, { headers: this.headers, responseType: 'blob' });
  }

  getVehicleDetails(id: number): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.get<any>(url, { headers: this.headers });
  }

  createVehicle(formData: FormData): Observable<any> {
    return this.httpPostMultipartMethod(formData);
  }

  updateVehicle(id: number, formData: FormData): Observable<any> {
    return this.httpPutMultipartMethod(id, formData);
  }

  deleteVehicle(id: number): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.delete<any>(url, { headers: this.headers });
  }
}
