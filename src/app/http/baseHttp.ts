import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export abstract class BaseHttpService {
  abstract get isAuthenticatedEndpoint(): boolean;
  abstract get endpoint(): string;

  public params: any;
  public httpClient: HttpClient;
  // refreshToken: string | null;

  constructor(public inject: Injector) {
    this.httpClient = this.inject.get(HttpClient);
  }

  get headers(): HttpHeaders {
    let user: any = this.getUserFromLocalStorage();
    let token = undefined;
    if (user) {
      user = JSON.parse(user);
      token = user.token;

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Token ' + token,
      });

      return headers;
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  get multipartHeaders(): HttpHeaders {
    let user: any = this.getUserFromLocalStorage();
    let token = undefined;
    if (user) {
      user = JSON.parse(user);
      token = user.token;
      return new HttpHeaders({
        Authorization: 'Token ' + token,
      });
    }
    return new HttpHeaders();
  }

  getUserFromLocalStorage(): any {
    if (typeof localStorage !== 'undefined') {
      let user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  get noUserMultipartHeaders(): HttpHeaders {
    return new HttpHeaders();
  }

  get payload() {
    let payload = this.params ? this.params : {};

    return payload;
  }

  httpGetMethod(params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.get(this.endpoint, {
      headers: this.headers,
      params: this.payload,
    });
  }

  httpNoUserGetMethod(params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.get(this.endpoint, {
      headers: this.noUserMultipartHeaders,
      params: this.payload,
    });
  }

  httpGetBlobMethod(params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.get(this.endpoint, {
      headers: this.headers,
      responseType: 'blob',
      observe: 'response',
      params: this.payload,
    });
  }

  httpPostMethod(params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.post(this.endpoint, this.payload, {
      headers: this.headers,
    });
  }

  httpPostMultipartMethod(params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.post(this.endpoint, this.payload, {
      headers: this.multipartHeaders,
    });
  }

  httpPutMethod(id: number, params: any): Observable<Object> {
    this.params = params ? params : undefined;
    const ENDAPI = this.endpoint + id + '/';
    return this.httpClient.put(ENDAPI, this.payload, {
      headers: this.headers,
    });
  }

  httpPutOutIdMethod(params: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.put(this.endpoint, this.payload, {
      headers: this.headers,
      params: this.params, // Attach
    });
  }

  httpPutMultipartMethod(id: number, params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    const ENDAPI = this.endpoint + id + '/';
    return this.httpClient.put(ENDAPI, this.payload, {
      headers: this.multipartHeaders,
    });
  }

  httpNoUserPostMultipartMethod(params?: any): Observable<Object> {
    this.params = params ? params : undefined;
    return this.httpClient.post(this.endpoint, this.payload, {
      headers: this.noUserMultipartHeaders,
    });
  }
}
