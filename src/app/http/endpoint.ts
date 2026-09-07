import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Endpoint {
  baseUrl: string = 'http://127.0.0.1:8000/';

  // user authentication

  get login(): string {
    return this.baseUrl + 'accounts/login/';
  }
}
