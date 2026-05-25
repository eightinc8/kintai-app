import { z } from "zod";

export const dailyReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  todaysPlan: z.string().optional().default(""),
  workDone: z.string().min(1, "作業内容を入力してください"),
  goodPoints: z.string().optional().default(""),
  reflections: z.string().optional().default(""),
  ideas: z.string().optional().default(""),
});

export type DailyReportFormData = z.infer<typeof dailyReportSchema>;

export const adminCommentSchema = z.object({
  reportId: z.string(),
  comment: z.string().min(1, "コメントを入力してください"),
});

export type AdminCommentFormData = z.infer<typeof adminCommentSchema>;
