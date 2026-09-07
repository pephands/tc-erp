import { Injectable, signal } from '@angular/core';
import { ApproveAssignRecord } from '../models/approve-assign.model';

@Injectable({
  providedIn: 'root'
})
export class ApproveAssignService {
  private records = signal<ApproveAssignRecord[]>([
    {
      requestId: '2615',
      branch: 'PERAMBUR',
      requestedDate: '07-09-2026 12:34:54',
      requestTask: 10000,
      base: 'Non Base',
      requestedBy: 'VASANTHA KUMAR',
      status: 'Progressing'
    },
    {
      requestId: '2614',
      branch: 'VIRUDHACHALAM',
      requestedDate: '07-09-2026 12:13:57',
      requestTask: 2000,
      base: 'Non Base',
      requestedBy: 'NANDHAKUMAR',
      status: 'Progressing'
    },
    {
      requestId: '2613',
      branch: 'REDHILLS',
      requestedDate: '07-09-2026 10:28:45',
      requestTask: 7000,
      base: 'Non Base',
      responseDate: '07-09-2026 10:33:20',
      responseTask: 7000,
      requestedBy: 'NANDHA KUMAR',
      status: 'Approved'
    },
    {
      requestId: '2612',
      branch: 'TAMBARAM',
      requestedDate: '07-09-2026 10:00:44',
      requestTask: 3500,
      base: 'Non Base',
      responseDate: '07-09-2026 10:08:27',
      responseTask: 3500,
      requestedBy: 'KAMALAKANNAN',
      status: 'Approved'
    },
    {
      requestId: '2611',
      branch: 'AMBATHUR',
      requestedDate: '07-09-2026 09:52:26',
      requestTask: 1800,
      base: 'Non Base',
      responseDate: '07-09-2026 10:08:16',
      responseTask: 1800,
      requestedBy: 'SANTHOSH',
      status: 'Approved'
    },
    {
      requestId: '2610',
      branch: 'SALEM',
      requestedDate: '07-09-2026 09:30:17',
      requestTask: 6000,
      base: 'Non Base',
      responseDate: '07-09-2026 10:08:06',
      responseTask: 6000,
      requestedBy: 'RAJASEKAR',
      status: 'Approved'
    },
    {
      requestId: '2609',
      branch: 'TEYNAMPET',
      requestedDate: '05-09-2026 10:30:50',
      requestTask: 8000,
      base: 'Non Base',
      responseDate: '05-09-2026 10:32:11',
      responseTask: 8000,
      requestedBy: 'SARAVANAN',
      status: 'Approved'
    },
    {
      requestId: '2608',
      branch: 'TAMBARAM',
      requestedDate: '05-09-2026 10:09:19',
      requestTask: 4500,
      base: 'Non Base',
      responseDate: '05-09-2026 10:31:59',
      responseTask: 4500,
      requestedBy: 'KAMALAKANNAN',
      status: 'Approved'
    },
    {
      requestId: '2607',
      branch: 'REDHILLS',
      requestedDate: '05-09-2026 09:58:04',
      requestTask: 5000,
      base: 'Non Base',
      responseDate: '05-09-2026 10:03:31',
      responseTask: 5000,
      requestedBy: 'NANDHA KUMAR',
      status: 'Approved'
    },
    {
      requestId: '2606',
      branch: 'AMBATHUR',
      requestedDate: '05-09-2026 09:50:44',
      requestTask: 3000,
      base: 'Non Base',
      responseDate: '05-09-2026 10:03:24',
      responseTask: 3000,
      requestedBy: 'SANTHOSH',
      status: 'Approved'
    },
    {
      requestId: '2605',
      branch: 'COIMBATORE',
      requestedDate: '04-09-2026 16:20:10',
      requestTask: 4200,
      base: 'Base',
      responseDate: '04-09-2026 16:45:00',
      responseTask: 4200,
      requestedBy: 'KARTHIK',
      status: 'Approved'
    },
    {
      requestId: '2604',
      branch: 'MADURAI',
      requestedDate: '04-09-2026 14:15:30',
      requestTask: 3100,
      base: 'Non Base',
      responseDate: '04-09-2026 15:00:22',
      responseTask: 3100,
      requestedBy: 'VIJAY',
      status: 'Approved'
    },
    {
      requestId: '2603',
      branch: 'TRICHY',
      requestedDate: '03-09-2026 11:10:05',
      requestTask: 2500,
      base: 'Base',
      responseDate: '03-09-2026 11:40:12',
      responseTask: 2500,
      requestedBy: 'RAMESH',
      status: 'Approved'
    },
    {
      requestId: '2602',
      branch: 'VELLORE',
      requestedDate: '03-09-2026 09:40:18',
      requestTask: 1500,
      base: 'Non Base',
      responseDate: '03-09-2026 10:12:00',
      responseTask: 1500,
      requestedBy: 'ANAND',
      status: 'Approved'
    },
    {
      requestId: '2601',
      branch: 'ERODE',
      requestedDate: '02-09-2026 15:05:44',
      requestTask: 5500,
      base: 'Base',
      responseDate: '02-09-2026 15:30:19',
      responseTask: 5500,
      requestedBy: 'SURESH',
      status: 'Approved'
    }
  ]);

  getRecords() {
    return this.records.asReadonly();
  }

  approveRequest(requestId: string): void {
    this.records.update(list => list.map(item => {
      if (item.requestId === requestId) {
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        return {
          ...item,
          status: 'Approved',
          responseDate: formattedDate,
          responseTask: item.requestTask
        };
      }
      return item;
    }));
  }

  cancelRequest(requestId: string): void {
    this.records.update(list => list.map(item => {
      if (item.requestId === requestId) {
        return {
          ...item,
          status: 'Cancelled'
        };
      }
      return item;
    }));
  }

  addRequest(branch: string, baseType: string, taskCount: number): void {
    const list = this.records();
    const nextId = (Math.max(...list.map(r => parseInt(r.requestId) || 2600)) + 1).toString();
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newRecord: ApproveAssignRecord = {
      requestId: nextId,
      branch: branch,
      requestedDate: formattedDate,
      requestTask: taskCount,
      base: baseType,
      requestedBy: 'NANDHAKUMAR',
      status: 'Progressing'
    };

    this.records.update(current => [newRecord, ...current]);
  }
}
