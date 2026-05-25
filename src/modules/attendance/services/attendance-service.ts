import { v4 as uuidv4 } from "uuid";
import type { Attendance } from "@/types/attendance";
import type { AttendanceFormData } from "../schemas/attendance-schema";
import {
  getRows,
  findRowByMultiple,
  appendRow,
  updateRow,
  findRow,
  findRows,
  deleteRow,
} from "@/lib/google-sheets";

function calcWorkHours(clockIn: string, clockOut: string, breakMinutes: number = 0): number {
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let totalMinutes = outH * 60 + outM - (inH * 60 + inM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  totalMinutes -= breakMinutes;
  if (totalMinutes < 0) totalMinutes = 0;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function rowToAttendance(row: Record<string, string>): Attendance {
  return {
    id: row.id,
    staffEmail: row.staff_email,
    date: row.date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    breakMinutes: Number(row.break_minutes) || 0,
    workHours: Number(row.work_hours) || 0,
    transportCost: Number(row.transport_cost) || 0,
    workStyle: row.work_style as "office" | "remote",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attendanceToRow(a: Attendance): Record<string, string> {
  return {
    id: a.id,
    staff_email: a.staffEmail,
    date: a.date,
    clock_in: a.clockIn,
    clock_out: a.clockOut,
    break_minutes: String(a.breakMinutes),
    work_hours: String(a.workHours),
    transport_cost: String(a.transportCost),
    work_style: a.workStyle,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

export async function submitAttendance(
  staffEmail: string,
  data: AttendanceFormData
): Promise<Attendance> {
  const now = new Date().toISOString();
  const existing = await findRowByMultiple("attendance", {
    staff_email: staffEmail,
    date: data.date,
  });

  const breakMin = data.breakMinutes ?? 0;
  const attendance: Attendance = {
    id: existing ? existing.data.id : uuidv4(),
    staffEmail,
    date: data.date,
    clockIn: data.clockIn,
    clockOut: data.clockOut,
    breakMinutes: breakMin,
    workHours: calcWorkHours(data.clockIn, data.clockOut, breakMin),
    transportCost: data.transportCost,
    workStyle: data.workStyle,
    createdAt: existing ? existing.data.created_at : now,
    updatedAt: now,
  };

  if (existing) {
    await updateRow("attendance", existing.rowIndex, attendanceToRow(attendance));
  } else {
    await appendRow("attendance", attendanceToRow(attendance));
  }

  return attendance;
}

export async function getAttendanceByDate(
  staffEmail: string,
  date: string
): Promise<Attendance | undefined> {
  const result = await findRowByMultiple("attendance", {
    staff_email: staffEmail,
    date,
  });
  return result ? rowToAttendance(result.data) : undefined;
}

export async function getMonthlyAttendance(
  staffEmail: string,
  yearMonth: string
): Promise<Attendance[]> {
  const rows = await getRows("attendance");
  return rows
    .filter((r) => r.staff_email === staffEmail && r.date.startsWith(yearMonth))
    .map(rowToAttendance);
}

export async function getAllMonthlyAttendance(
  yearMonth: string
): Promise<Attendance[]> {
  const rows = await getRows("attendance");
  return rows
    .filter((r) => r.date.startsWith(yearMonth))
    .map(rowToAttendance);
}

export async function updateAttendanceById(
  id: string,
  data: AttendanceFormData
): Promise<Attendance | undefined> {
  const result = await findRow("attendance", "id", id);
  if (!result) return undefined;

  const existing = rowToAttendance(result.data);
  const breakMin = data.breakMinutes ?? 0;
  const updated: Attendance = {
    ...existing,
    date: data.date,
    clockIn: data.clockIn,
    clockOut: data.clockOut,
    breakMinutes: breakMin,
    workHours: calcWorkHours(data.clockIn, data.clockOut, breakMin),
    transportCost: data.transportCost,
    workStyle: data.workStyle,
    updatedAt: new Date().toISOString(),
  };

  await updateRow("attendance", result.rowIndex, attendanceToRow(updated));
  return updated;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  const result = await findRow("attendance", "id", id);
  if (!result) return false;
  await deleteRow("attendance", result.rowIndex);
  return true;
}

export async function getAttendanceById(
  id: string
): Promise<Attendance | undefined> {
  const result = await findRow("attendance", "id", id);
  return result ? rowToAttendance(result.data) : undefined;
}

export async function getAttendancesByDate(
  staffEmail: string,
  date: string
): Promise<Attendance[]> {
  const rows = await findRows("attendance", "staff_email", staffEmail);
  return rows
    .filter((r) => r.data.date === date)
    .map((r) => rowToAttendance(r.data));
}

export async function submitAttendanceShifts(
  staffEmail: string,
  date: string,
  shifts: AttendanceFormData[]
): Promise<Attendance[]> {
  const now = new Date().toISOString();

  // 1. 既存行を取得（rowIndex付き）
  const existingRows = await findRows("attendance", "staff_email", staffEmail);
  const matchingRows = existingRows.filter((r) => r.data.date === date);

  // 2. 既存行を降順で削除（インデックスずれ防止）
  const sortedIndices = matchingRows
    .map((r) => r.rowIndex)
    .sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    await deleteRow("attendance", idx);
  }

  // 3. 新しいシフトを追加
  const results: Attendance[] = [];
  for (const shift of shifts) {
    const breakMin = shift.breakMinutes ?? 0;
    const attendance: Attendance = {
      id: uuidv4(),
      staffEmail,
      date: shift.date,
      clockIn: shift.clockIn,
      clockOut: shift.clockOut,
      breakMinutes: breakMin,
      workHours: calcWorkHours(shift.clockIn, shift.clockOut, breakMin),
      transportCost: shift.transportCost,
      workStyle: shift.workStyle,
      createdAt: now,
      updatedAt: now,
    };
    await appendRow("attendance", attendanceToRow(attendance));
    results.push(attendance);
  }

  return results;
}
