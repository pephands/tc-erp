import { Injectable, signal } from '@angular/core';
import { AttendanceRecord, MOCK_ATTENDANCE } from '../models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  readonly attendanceRecords = signal<AttendanceRecord[]>(MOCK_ATTENDANCE);

  getAttendanceRecords(): AttendanceRecord[] {
    return this.attendanceRecords();
  }

  refreshAttendance(): void {
    // Simulate refreshing dataset
    const current = [...this.attendanceRecords()];
    this.attendanceRecords.set(current);
  }
}
