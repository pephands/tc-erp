import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';
import { BranchExpenseRecord, deserializeBranchExpense } from '../models/branch-expense.model';

@Injectable({
  providedIn: 'root',
})
export class BranchExpenseService extends BaseHttpService {
  public expensesSignal = signal<BranchExpenseRecord[]>([]);

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
    return this.endPoint.branchExpenses;
  }

  getExpenses() {
    return this.expensesSignal.asReadonly();
  }

  fetchExpenses(
    branch?: string,
    startDate?: string,
    endDate?: string,
    singleDate?: string,
    search?: string
  ): Observable<BranchExpenseRecord[]> {
    const params: any = {};
    if (branch) params.branch = branch;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (singleDate) params.date = singleDate;
    if (search) params.search = search;

    return this.httpGetMethod(params).pipe(
      map((res: any) => {
        let items: any[] = [];
        if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }
        const records = items.map((item: any) => deserializeBranchExpense(item));
        this.expensesSignal.set(records);
        return records;
      })
    );
  }

  createExpense(formData: FormData): Observable<any> {
    return this.httpPostMultipartMethod(formData);
  }

  updateExpense(id: string | number, formData: FormData): Observable<any> {
    return this.httpPutMultipartMethod(Number(id), formData);
  }

  deleteExpense(id: string | number): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.delete(url, { headers: this.headers });
  }

  exportExpensesExcel(
    branch?: string,
    startDate?: string,
    endDate?: string,
    singleDate?: string,
    search?: string
  ): Observable<Blob> {
    const params: any = {};
    if (branch) params.branch = branch;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (singleDate) params.date = singleDate;
    if (search) params.search = search;

    return this.httpClient.get(this.endPoint.branchExpenseExport, {
      headers: this.headers,
      params,
      responseType: 'blob'
    });
  }

  fetchExpenseSummary(
    startDate?: string,
    endDate?: string,
    singleDate?: string
  ): Observable<any> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (singleDate) params.date = singleDate;

    return this.httpClient.get(this.endPoint.branchExpenseSummary, {
      headers: this.headers,
      params
    });
  }
}
