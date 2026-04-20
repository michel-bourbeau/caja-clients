// Schedule Service - Handle employee schedules

import { Employee, EmployeeSchedule, TimeEntry } from "@/lib/types";

export class ScheduleService {
  /**
   * Create or update employee schedule
   */
  static async setSchedule(
    employeeId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isWorking: boolean
  ): Promise<EmployeeSchedule> {
    const schedule: EmployeeSchedule = {
      id: this.generateScheduleId(),
      employeeId,
      dayOfWeek,
      startTime,
      endTime,
      isWorking,
    };

    // TODO: Send to API
    return schedule;
  }

  /**
   * Check in employee
   */
  static async checkIn(employeeId: string): Promise<TimeEntry> {
    const timeEntry: TimeEntry = {
      id: this.generateTimeEntryId(),
      employeeId,
      checkInTime: new Date(),
      date: new Date(),
    };

    // TODO: Send to API
    return timeEntry;
  }

  /**
   * Check out employee
   */
  static async checkOut(timeEntryId: string): Promise<TimeEntry> {
    // TODO: Get existing entry from API and update
    return {
      id: timeEntryId,
      employeeId: "",
      checkInTime: new Date(),
      checkOutTime: new Date(),
      date: new Date(),
    };
  }

  /**
   * Calculate total hours for period
   */
  static calculateTotalHours(timeEntries: TimeEntry[]): number {
    return timeEntries.reduce((total, entry) => {
      if (!entry.checkOutTime) return total;
      const diffMs = entry.checkOutTime.getTime() - entry.checkInTime.getTime();
      return total + diffMs / (1000 * 60 * 60);
    }, 0);
  }

  /**
   * Check if employee is scheduled for today
   */
  static isScheduledToday(schedule: EmployeeSchedule): boolean {
    const today = new Date().getDay();
    return schedule.dayOfWeek === (today === 0 ? 6 : today - 1) && schedule.isWorking;
  }

  /**
   * Get employee's daily schedule
   */
  static getDaySchedule(schedules: EmployeeSchedule[], dayOfWeek: number): EmployeeSchedule[] {
    return schedules.filter((s) => s.dayOfWeek === dayOfWeek && s.isWorking);
  }

  /**
   * Generate schedule ID
   */
  static generateScheduleId(): string {
    return `SCH-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();
  }

  /**
   * Generate time entry ID
   */
  static generateTimeEntryId(): string {
    return `TE-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();
  }
}
