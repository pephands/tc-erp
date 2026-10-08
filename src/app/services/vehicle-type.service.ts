import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';
import { VehicleType } from '../models/vehicle-type.model';

@Injectable({
  providedIn: 'root'
})
export class VehicleTypeService extends BaseHttpService {
  public vehicleTypesSignal = signal<VehicleType[]>([]);

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
    return this.endPoint.branchVehicleTypes;
  }

  fetchVehicleTypes(isActive?: boolean): Observable<VehicleType[]> {
    let url = this.endpoint;
    if (isActive !== undefined) {
      url += `?is_active=${isActive}`;
    }
    return this.httpClient.get<any>(url, { headers: this.headers }).pipe(
      map(res => {
        let items = res;
        if (res && res.results) {
          items = res.results;
        } else if (res && res.data) {
          items = res.data;
        }
        if (isActive === undefined) {
          this.vehicleTypesSignal.set(items);
        }
        return items;
      })
    );
  }

  createVehicleType(data: VehicleType): Observable<any> {
    return this.httpPostMethod(data);
  }

  updateVehicleType(id: number, data: Partial<VehicleType>): Observable<any> {
    return this.httpPutMethod(id, data);
  }
}
