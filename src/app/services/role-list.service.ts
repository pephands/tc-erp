import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Endpoint } from '../http/endpoint';

@Injectable({
  providedIn: 'root'
})
export class RoleListService {
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

  getRoles(): Observable<any> {
    return this.httpClient.get(this.endpoint.roles, { headers: this.headers });
  }

  updateRole(id: number, data: any): Observable<any> {
    return this.httpClient.patch(`${this.endpoint.roles}${id}/`, data, { headers: this.headers });
  }

  deleteRole(id: number): Observable<any> {
    return this.httpClient.delete(`${this.endpoint.roles}${id}/`, { headers: this.headers });
  }
}
