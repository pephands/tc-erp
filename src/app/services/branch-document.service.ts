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

  fetchDocuments(branchIdOrName?: string, search?: string): Observable<BranchDocumentRecord[]> {
    const params: any = {};
    if (branchIdOrName) {
      params.branch = branchIdOrName;
    }
    if (search) {
      params.search = search;
    }

    return this.httpGetMethod(params).pipe(
      map((res: any) => {
        let items: any[] = [];
        if (res && res.status === 'success' && res.data) {
          items = Array.isArray(res.data) ? res.data : [res.data];
        } else if (Array.isArray(res)) {
          items = res;
        }
        const records = items.map((item: any) => deserializeBranchDocument(item));
        this.documentsSignal.set(records);
        return records;
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
