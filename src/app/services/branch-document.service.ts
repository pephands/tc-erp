import { Injectable, Injector, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../http/baseHttp';
import { Endpoint } from '../http/endpoint';
import { BranchDocumentRecord, deserializeBranchDocument } from '../models/branch-document.model';

@Injectable({
  providedIn: 'root',
})
export class BranchDocumentService extends BaseHttpService {
  public documentsSignal = signal<BranchDocumentRecord[]>([]);

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
    return this.endPoint.branchDocuments;
  }

  getDocuments() {
    return this.documentsSignal.asReadonly();
  }

  public totalItemsSignal = signal<number>(0);

  getTotalItems() {
    return this.totalItemsSignal.asReadonly();
  }

  fetchDocuments(params: any = {}): Observable<any> {
    return this.httpGetMethod(params).pipe(
      map((res: any) => {
        let items: any[] = [];
        let count = 0;
        if (res && res.status === 'success' && res.data) {
          if (Array.isArray(res.data)) {
            items = res.data;
            count = items.length;
          } else if (res.data.results && Array.isArray(res.data.results)) {
            items = res.data.results;
            count = res.data.count || items.length;
          } else {
            items = [res.data];
            count = 1;
          }
        } else if (res && res.results && Array.isArray(res.results)) {
          items = res.results;
          count = res.count || items.length;
        } else if (Array.isArray(res)) {
          items = res;
          count = items.length;
        }
        const records = items.map((item: any) => deserializeBranchDocument(item));
        this.documentsSignal.set(records);
        this.totalItemsSignal.set(count);
        return { records, count };
      })
    );
  }

  createDocument(formData: FormData): Observable<any> {
    return this.httpPostMultipartMethod(formData);
  }

  updateDocument(id: string | number, formData: FormData): Observable<any> {
    return this.httpPutMultipartMethod(Number(id), formData);
  }

  deleteDocument(id: string | number): Observable<any> {
    const url = `${this.endpoint}${id}/`;
    return this.httpClient.delete(url, { headers: this.headers });
  }
}
