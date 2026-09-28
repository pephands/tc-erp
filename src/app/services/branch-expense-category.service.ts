import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';
import { BranchExpenseCategory, deserializeBranchExpenseCategory } from '../models/branch-expense-category.model';

@Injectable({
  providedIn: 'root',
})
export class BranchExpenseCategoryService extends BaseHttpService {
  public categoriesSignal = signal<BranchExpenseCategory[]>([]);

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
    return this.endPoint.branchExpenseCategories;
  }

  getCategories() {
    return this.categoriesSignal.asReadonly();
  }

  fetchCategories(): Observable<BranchExpenseCategory[]> {
    return this.httpGetMethod().pipe(
      map((res: any) => {
        let items: any[] = [];
        if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && res.results) { // generic DRF response
          items = res.results;
        }
        
        const records = items.map((item: any) => deserializeBranchExpenseCategory(item));
        this.categoriesSignal.set(records);
        return records;
      })
    );
  }

  createCategory(data: { name: string, is_active?: boolean }): Observable<any> {
    return this.httpPostMethod(data);
  }

  updateCategory(id: number | string, data: { name?: string, is_active?: boolean }): Observable<any> {
    return this.httpPutMethod(Number(id), data);
  }

  deleteCategory(id: number | string): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.delete(url, { headers: this.headers });
  }
}
