import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';

export interface WFHPasscodeRecord {
  id: number;
  user: number;
  user_details?: {
    id: number;
    username: string;
    full_name: string;
  };
  date: string;
  passcode: string;
  is_used: boolean;
  used_at?: string;
  created_by?: number;
  created_by_details?: {
    id: number;
    username: string;
    full_name: string;
  };
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class WFHPasscodeService extends BaseHttpService {
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
    return this.endPoint.wfhPasscode;
  }

  getPasscodes(dateStr?: string): Observable<any> {
    const url = dateStr ? `${this.endpoint}?date=${dateStr}` : this.endpoint;
    return this.httpClient.get(url, { headers: this.headers });
  }

  generatePasscode(userId: number, dateStr?: string): Observable<any> {
    const payload: { user_id: number; date?: string } = { user_id: userId };
    if (dateStr) {
      payload.date = dateStr;
    }
    return this.httpPostMethod(payload);
  }

  requestPasscode(): Observable<any> {
    return this.httpClient.post(this.endPoint.wfhRequest, {}, { headers: this.headers });
  }
}
