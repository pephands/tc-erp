import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

export interface AttendanceCheckOutPayload {
  attendance_id: number;
  latitude: number;
  longitude: number;
  ip_address?: string;
  deviceid?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceCheckOutService extends BaseHttpService {
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
    return this.endPoint.attendanceCheckOut;
  }

  getData(params?: AttendanceCheckOutPayload): Observable<object> {
    return this.httpPostMethod(params);
  }
}
