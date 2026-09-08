import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleListService {
  private httpClient = inject(HttpClient);
  private endpoint = 'http://localhost:8000/accounts/roles/';

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
    return this.httpClient.get(this.endpoint, { headers: this.headers });
  }
}
