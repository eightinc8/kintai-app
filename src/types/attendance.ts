export type WorkStyle = "office" | "remote";

export interface Attendance {
  id: string;
  staffEmail: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  workHours: number;
  transportCost: number;
  workStyle: WorkStyle;
  createdAt: string;
  updatedAt: string;
}
