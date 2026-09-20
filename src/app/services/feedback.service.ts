import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Endpoint } from '../http/endpoint';
import { FeedbackRecord } from '../models/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private httpClient = inject(HttpClient);
  private endPoint = inject(Endpoint);

  private get headers(): HttpHeaders {
    let token = localStorage.getItem('token');
    if (!token) {
      try {
        const stored = localStorage.getItem('tc_erp_auth_session');
        if (stored) {
          const session = JSON.parse(stored);
          token = session?.token || null;
        }
      } catch (e) {
        console.error('Failed to parse tc_erp_auth_session token', e);
      }
    }

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Token ${token}`);
    }
    return headers;
  }

  fetchFeedbacks(params?: any): Observable<any> {
    return this.httpClient.get(this.endPoint.feedbacks, {
      headers: this.headers,
      params,
    });
  }

  fetchFeedbackDetail(id: number): Observable<any> {
    return this.httpClient.get(`${this.endPoint.feedbacks}${id}/`, {
      headers: this.headers,
    });
  }

  submitFeedback(subject: string, category: string, message: string): Observable<any> {
    const payload = { subject, category, message };
    return this.httpClient.post(this.endPoint.feedbacks, payload, {
      headers: this.headers,
    });
  }

  resolveFeedback(id: number, status: string, adminNotes: string): Observable<any> {
    const url = this.endPoint.feedbackResolve(id);
    const payload = { status, admin_notes: adminNotes };
    return this.httpClient.patch(url, payload, {
      headers: this.headers,
    });
  }
}
