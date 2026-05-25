import { NextResponse } from "next/server";
import {
  submitReport,
  getAllReports,
  submitAdminComment,
  deleteReport,
  getReportById,
  updateReportById,
} from "@/modules/daily-report/services/report-service";
import { requireAuth, requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const reports = await getAllReports();
    return NextResponse.json(reports);
  } catch (e) {
    console.error("Reports fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { staffEmail, data } = await request.json();
    if (staffEmail !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーとしての操作はできません" }, { status: 403 });
    }
    const result = await submitReport(staffEmail, data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Report submit error:", e);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { reportId, comment } = await request.json();
    const result = await submitAdminComment(reportId, comment, session!.user.email!);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Comment submit error:", e);
    return NextResponse.json({ error: "コメント保存に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id, data } = await request.json();
    const existing = await getReportById(id);
    if (!existing) {
      return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });
    }
    if (session!.user.role !== "admin" && existing.staffEmail !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーのデータは編集できません" }, { status: 403 });
    }
    const result = await updateReportById(id, data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Report update error:", e);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
    }
    const existing = await getReportById(id);
    if (!existing) {
      return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });
    }
    if (session!.user.role !== "admin" && existing.staffEmail !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーのデータは削除できません" }, { status: 403 });
    }
    await deleteReport(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Report delete error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
