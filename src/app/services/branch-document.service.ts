import { Injectable, signal } from '@angular/core';
import { BranchDocumentRecord } from '../models/branch-document.model';

@Injectable({
  providedIn: 'root'
})
export class BranchDocumentService {
  private documents = signal<BranchDocumentRecord[]>([
    {
      id: '489',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN87B4671',
      fileName: 'TN87B4671_-_BUS_(C).pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '21-Jan-2022'
    },
    {
      id: '452',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN05CA7439',
      fileName: 'TN05CA7439_-_DOST_(C).pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '09-Sep-2022'
    },
    {
      id: '454',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN05CF7502',
      fileName: 'TN05CF7502_-_STARBUS_(C).pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '31-Mar-2024'
    },
    {
      id: '474',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN14AK3665',
      fileName: 'TN14AK3665_-_BUS_(C).pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '14-Jun-2025'
    },
    {
      id: '478',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN14AM6318',
      fileName: 'TN14AM6318_-_EECO_AMBULANCE_.pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '07-Jan-2026'
    },
    {
      id: '479',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN14AM8898',
      fileName: 'TN14AM8898_-_EECO_AMBULANCE_.pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '29-Jan-2026'
    },
    {
      id: '480',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN14AR3290',
      fileName: 'TN14AR3290_-_e-Rickshaw.pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '08-Sep-2026'
    },
    {
      id: '33',
      createdDate: '12-Jun-2025',
      documentName: 'TEYNAMPET RENTAL AGREEMENT 31/10/2026',
      fileName: 'Teynampet (2).pdf',
      branchName: '7-TEYNAMPET',
      expiryDate: '31-Oct-2026'
    },
    {
      id: '481',
      createdDate: '05-Sep-2026',
      documentName: 'RC_TN14AS1890',
      fileName: 'TN14AS1890_-_MONTRA_ELECTRIC_.pdf',
      branchName: '55-VEHICLE DOCUMENTS',
      expiryDate: '24-Nov-2026'
    },
    {
      id: '428',
      createdDate: '23-Feb-2026',
      documentName: 'TAMBARAM RENTAL AGREEMENT',
      fileName: 'ATC_Tambaram____.pdf',
      branchName: '6-TAMBARAM',
      expiryDate: '30-Nov-2026'
    },
    {
      id: '420',
      createdDate: '15-Jan-2026',
      documentName: 'PERAMBUR LEASE AGREEMENT',
      fileName: 'Perambur_Lease.pdf',
      branchName: '1-PERAMBUR',
      expiryDate: '15-Dec-2026'
    },
    {
      id: '415',
      createdDate: '10-Jan-2026',
      documentName: 'REDHILLS RENTAL AGREEMENT',
      fileName: 'Redhills_Rental.pdf',
      branchName: '3-REDHILLS',
      expiryDate: '10-Jan-2027'
    }
  ]);

  getDocuments() {
    return this.documents.asReadonly();
  }

  deleteDocument(id: string): void {
    this.documents.update(list => list.filter(item => item.id !== id));
  }

  addDocument(docName: string, fileName: string, branchName: string, expiryDate: string): void {
    const list = this.documents();
    const nextId = (Math.max(...list.map(d => parseInt(d.id) || 400)) + 1).toString();
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const createdDateStr = `${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${now.getFullYear()}`;

    const newDoc: BranchDocumentRecord = {
      id: nextId,
      createdDate: createdDateStr,
      documentName: docName,
      fileName: fileName,
      branchName: branchName,
      expiryDate: expiryDate
    };

    this.documents.update(current => [newDoc, ...current]);
  }
}
