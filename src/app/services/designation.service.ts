import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class DesignationService {
  private httpClient = inject(HttpClient);
  private endpoint = inject(Endpoint);

  private get headers(): HttpHeaders {
    let userStr = localStorage.getItem('tc_erp_auth_session');
    let token = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token || '';
      } catch (e) {}
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Token ${token}` : ''
    });
  }

  getDesignations(isActive?: string): Observable<any> {
    let url = this.endpoint.designations;
    if (isActive !== undefined) {
      url += `?is_active=${isActive}`;
    }
    return this.httpClient.get(url, { headers: this.headers });
  }

  createDesignation(data: any): Observable<any> {
    return this.httpClient.post(this.endpoint.designations, data, { headers: this.headers });
  }

  updateDesignation(id: number, data: any): Observable<any> {
    return this.httpClient.patch(`${this.endpoint.designations}${id}/`, data, { headers: this.headers });
  }

  deleteDesignation(id: number): Observable<any> {
    return this.httpClient.delete(`${this.endpoint.designations}${id}/`, { headers: this.headers });
  }
}
