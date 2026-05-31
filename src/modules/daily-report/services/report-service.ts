import { v4 as uuidv4 } from "uuid";
import type { DailyReport, Idea } from "@/types/report";
import type { DailyReportFormData } from "../schemas/report-schema";
import {
  getRows,
  findRow,
  findRowByMultiple,
  appendRow,
  updateRow,
  deleteRow,
} from "@/lib/google-sheets";

function rowToReport(row: Record<string, string>): DailyReport {
  return {
    id: row.id,
    staffEmail: row.staff_email,
    date: row.date,
    todaysPlan: row.todays_plan,
    workDone: row.work_done,
    goodPoints: row.good_points,
    reflections: row.reflections,
    adminComment: row.admin_comment,
    adminCommentBy: row.admin_comment_by,
    adminCommentAt: row.admin_comment_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function reportToRow(r: DailyReport): Record<string, string> {
  return {
    id: r.id,
    staff_email: r.staffEmail,
    date: r.date,
    todays_plan: r.todaysPlan,
    work_done: r.workDone,
    good_points: r.goodPoints,
    reflections: r.reflections,
    admin_comment: r.adminComment,
    admin_comment_by: r.adminCommentBy,
    admin_comment_at: r.adminCommentAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function rowToIdea(row: Record<string, string>): Idea {
  return {
    id: row.id,
    staffEmail: row.staff_email,
    date: row.date,
    content: row.content,
    category: row.category || "",
    isDone: row.is_done?.toUpperCase() === "TRUE",
    doneAt: row.done_at,
    doneBy: row.done_by || "",
    createdAt: row.created_at,
  };
}

function ideaToRow(idea: Idea): Record<string, string> {
  return {
    id: idea.id,
    staff_email: idea.staffEmail,
    date: idea.date,
    content: idea.content,
    category: idea.category || "",
    is_done: idea.isDone ? "TRUE" : "FALSE",
    done_at: idea.doneAt,
    done_by: idea.doneBy || "",
    created_at: idea.createdAt,
  };
}

export async function submitReport(
  staffEmail: string,
  data: DailyReportFormData
): Promise<DailyReport> {
  const now = new Date().toISOString();
  const existing = await findRowByMultiple("daily_reports", {
    staff_email: staffEmail,
    date: data.date,
  });

  const report: DailyReport = {
    id: existing ? existing.data.id : uuidv4(),
    staffEmail,
    date: data.date,
    todaysPlan: data.todaysPlan ?? "",
    workDone: data.workDone,
    goodPoints: data.goodPoints ?? "",
    reflections: data.reflections ?? "",
    adminComment: existing ? existing.data.admin_comment : "",
    adminCommentBy: existing ? existing.data.admin_comment_by : "",
    adminCommentAt: existing ? existing.data.admin_comment_at : "",
    createdAt: existing ? existing.data.created_at : now,
    updatedAt: now,
  };

  if (existing) {
    await updateRow("daily_reports", existing.rowIndex, reportToRow(report));
  } else {
    await appendRow("daily_reports", reportToRow(report));
  }

  // アイディアを個別に追加
  if (data.ideas && data.ideas.trim()) {
    const lines = data.ideas
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      const idea: Idea = {
        id: uuidv4(),
        staffEmail,
        date: data.date,
        content: line,
        category: "",
        isDone: false,
        doneAt: "",
        doneBy: "",
        createdAt: now,
      };
      await appendRow("ideas", ideaToRow(idea));
    }
  }

  return report;
}

export async function submitIdeas(
  staffEmail: string,
  ideasText: string
): Promise<Idea[]> {
  const now = new Date().toISOString();
  const date = now.slice(0, 10);
  const lines = ideasText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const created: Idea[] = [];
  for (const line of lines) {
    const idea: Idea = {
      id: uuidv4(),
      staffEmail,
      date,
      content: line,
      category: "",
      isDone: false,
      doneAt: "",
      doneBy: "",
      createdAt: now,
    };
    await appendRow("ideas", ideaToRow(idea));
    created.push(idea);
  }
  return created;
}

export async function getReportByDate(
  staffEmail: string,
  date: string
): Promise<DailyReport | undefined> {
  const result = await findRowByMultiple("daily_reports", {
    staff_email: staffEmail,
    date,
  });
  return result ? rowToReport(result.data) : undefined;
}

export async function getAllReports(): Promise<DailyReport[]> {
  const rows = await getRows("daily_reports");
  return rows.map(rowToReport);
}

export async function submitAdminComment(
  reportId: string,
  comment: string,
  adminEmail: string
): Promise<DailyReport | undefined> {
  const result = await findRow("daily_reports", "id", reportId);
  if (!result) return undefined;

  const report = rowToReport(result.data);
  report.adminComment = comment;
  report.adminCommentBy = adminEmail;
  report.adminCommentAt = new Date().toISOString();
  report.updatedAt = new Date().toISOString();

  await updateRow("daily_reports", result.rowIndex, reportToRow(report));
  return report;
}

export async function getAllIdeas(): Promise<Idea[]> {
  const rows = await getRows("ideas");
  return rows.map(rowToIdea);
}

export async function getIdeasByEmail(email: string): Promise<Idea[]> {
  const rows = await getRows("ideas");
  return rows.filter((r) => r.staff_email === email).map(rowToIdea);
}

export async function toggleIdeaDone(
  id: string,
  doneByEmail?: string
): Promise<Idea | undefined> {
  const result = await findRow("ideas", "id", id);
  if (!result) return undefined;

  const idea = rowToIdea(result.data);
  idea.isDone = !idea.isDone;
  idea.doneAt = idea.isDone ? new Date().toISOString() : "";
  idea.doneBy = idea.isDone ? (doneByEmail || "") : "";

  await updateRow("ideas", result.rowIndex, ideaToRow(idea));
  return idea;
}

export async function updateIdeaCategory(
  id: string,
  category: string
): Promise<Idea | undefined> {
  const result = await findRow("ideas", "id", id);
  if (!result) return undefined;

  const idea = rowToIdea(result.data);
  idea.category = category;

  await updateRow("ideas", result.rowIndex, ideaToRow(idea));
  return idea;
}

export async function deleteReport(id: string): Promise<boolean> {
  const result = await findRow("daily_reports", "id", id);
  if (!result) return false;
  await deleteRow("daily_reports", result.rowIndex);
  return true;
}

export async function getReportById(
  id: string
): Promise<DailyReport | undefined> {
  const result = await findRow("daily_reports", "id", id);
  return result ? rowToReport(result.data) : undefined;
}

export async function updateReportById(
  id: string,
  data: Partial<DailyReportFormData>
): Promise<DailyReport | undefined> {
  const result = await findRow("daily_reports", "id", id);
  if (!result) return undefined;

  const existing = rowToReport(result.data);
  const updated: DailyReport = {
    ...existing,
    todaysPlan: data.todaysPlan ?? existing.todaysPlan,
    workDone: data.workDone ?? existing.workDone,
    goodPoints: data.goodPoints ?? existing.goodPoints,
    reflections: data.reflections ?? existing.reflections,
    updatedAt: new Date().toISOString(),
  };

  await updateRow("daily_reports", result.rowIndex, reportToRow(updated));
  return updated;
}
