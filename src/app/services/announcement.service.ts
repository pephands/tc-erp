import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Announcement {
  id: number;
  title: string;
  description?: string;
  image?: string;
  video?: string;
  document?: string;
  youtube_link?: string;
  instagram_link?: string;
  cta_link?: string;
  is_active: boolean;
  hold_timer?: number;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}internal/announcements/active/`;
  private adminApiUrl = `${environment.baseUrl}internal/announcements/`;

  private getHeaders(): { headers: any } {
    const sessionStr = localStorage.getItem('tc_erp_auth_session');
    let headers = {};
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session && session.token) {
          headers = { Authorization: `Token ${session.token}` };
        }
      } catch (e) {}
    }
    return { headers };
  }

  getActiveAnnouncement(): Observable<{ status: string; data: Announcement | null }> {
    return this.http.get<{ status: string; data: Announcement | null }>(this.apiUrl, this.getHeaders());
  }

  getAnnouncements(): Observable<{ status: string; data: Announcement[] }> {
    return this.http.get<{ status: string; data: Announcement[] }>(this.adminApiUrl, this.getHeaders());
  }

  createAnnouncement(data: FormData): Observable<{ status: string; data: Announcement }> {
    return this.http.post<{ status: string; data: Announcement }>(this.adminApiUrl, data, this.getHeaders());
  }

  updateAnnouncement(id: number, data: FormData): Observable<{ status: string; data: Announcement }> {
    return this.http.put<{ status: string; data: Announcement }>(`${this.adminApiUrl}${id}/`, data, this.getHeaders());
  }

  deleteAnnouncement(id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.adminApiUrl}${id}/`, this.getHeaders());
  }
}
