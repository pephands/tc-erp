import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FoodMenu {
  id: number;
  trust_name: number;
  trust_name_display: string;
  slot: string;
  menu_name: string;
  amount: number;
  is_active: boolean;
}

export interface FoodBookingPayment {
  id?: number;
  booking: number;
  amount_paid: number;
  payment_date: string;
  reference_id: string;
  created_at?: string;
}

export interface FoodBooking {
  id: number;
  trust_name: number;
  trust_name_display: string;
  branch?: number;
  branch_display?: string;
  menu: number;
  menu_name_display: string;
  slot_display: string;
  booking_date: string;
  occasion_name: string;
  total_amount: number;
  donor_name: string;
  mobile_number: string;
  booking_status: 'RESERVED' | 'BOOKED' | 'COMPLETED';
  is_active: boolean;
  total_paid_amount: number;
  payments: FoodBookingPayment[];
}

@Injectable({
  providedIn: 'root'
})
export class FoodBookingService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      if (typeof localStorage !== 'undefined') {
        const userStr = localStorage.getItem('tc_erp_auth_session');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user && user.token) {
            headers = headers.set('Authorization', 'Token ' + user.token);
          }
        }
      }
    } catch (e) {}
    return headers;
  }

  // Food Menus
  getFoodMenus(trustId?: number): Observable<FoodMenu[]> {
    let params = new HttpParams();
    if (trustId) {
      params = params.set('trust_name', trustId.toString());
    }
    return this.http.get<FoodMenu[]>(`${this.baseUrl}branches/food-menus/`, { headers: this.getHeaders(), params });
  }

  createFoodMenu(data: any): Observable<FoodMenu> {
    return this.http.post<FoodMenu>(`${this.baseUrl}branches/food-menus/`, data, { headers: this.getHeaders() });
  }

  updateFoodMenu(id: number, data: any): Observable<FoodMenu> {
    return this.http.patch<FoodMenu>(`${this.baseUrl}branches/food-menus/${id}/`, data, { headers: this.getHeaders() });
  }

  // Food Bookings
  getFoodBookings(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    
    // We can return the full response which might be paginated or just the array.
    return this.http.get<any>(`${this.baseUrl}branches/food-bookings/`, { headers: this.getHeaders(), params });
  }

  exportBookings(filters: any = {}): void {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    // In a real app, hit an export endpoint. Since we don't have an export endpoint in Django yet, 
    // we would build one or do it in the frontend. We will just alert for now or implement frontend CSV export.
  }

  createFoodBooking(data: any): Observable<FoodBooking> {
    return this.http.post<FoodBooking>(`${this.baseUrl}branches/food-bookings/`, data, { headers: this.getHeaders() });
  }
  
  updateFoodBooking(id: number, data: any): Observable<FoodBooking> {
    return this.http.patch<FoodBooking>(`${this.baseUrl}branches/food-bookings/${id}/`, data, { headers: this.getHeaders() });
  }

  deleteFoodBooking(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}branches/food-bookings/${id}/`, { headers: this.getHeaders() });
  }

  // Payments
  addPayment(data: FoodBookingPayment): Observable<FoodBookingPayment> {
    return this.http.post<FoodBookingPayment>(`${this.baseUrl}branches/food-booking-payments/`, data, { headers: this.getHeaders() });
  }

  updatePayment(id: number, data: any): Observable<FoodBookingPayment> {
    return this.http.patch<FoodBookingPayment>(`${this.baseUrl}branches/food-booking-payments/${id}/`, data, { headers: this.getHeaders() });
  }

  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}branches/food-booking-payments/${id}/`, { headers: this.getHeaders() });
  }
}
