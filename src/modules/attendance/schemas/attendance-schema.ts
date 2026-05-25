import { z } from "zod";

export const attendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clockIn: z.string().regex(/^\d{2}:\d{2}$/),
  clockOut: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.coerce.number().min(0).max(120).default(0),
  transportCost: z.coerce.number().min(0),
  workStyle: z.enum(["office", "remote"]),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;
