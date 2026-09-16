import { Injectable, Injector, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Endpoint } from '../http/endpoint';
import { BaseHttpService } from '../http/baseHttp';

@Injectable({
  providedIn: 'root',
})
export class PaymentService extends BaseHttpService {
  private endPoint = inject(Endpoint);

  get isAuthenticatedEndpoint(): boolean {
    return true;
  }

  get endpoint(): string {
    return this.endPoint.paymentRecords;
  }

  constructor(injector: Injector) {
    super(injector);
  }

  getRecords(
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1
  ): Observable<any> {
    let params = new HttpParams().set('page', page.toString());
    if (status) {
      params = params.set('status', status);
    }
    if (search) {
      params = params.set('search', search);
    }
    if (startDate) {
      params = params.set('start_date', startDate);
    }
    if (endDate) {
      params = params.set('end_date', endDate);
    }

    return this.httpClient.get<any>(this.endpoint, {
      headers: this.headers,
      params,
    });
  }

  createOnlinePayment(formData: FormData): Observable<any> {
    return this.httpClient.post<any>(this.endpoint, formData, {
      headers: this.multipartHeaders,
    });
  }
}
