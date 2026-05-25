import { NextResponse } from "next/server";
import {
  submitAttendance,
  submitAttendanceShifts,
  getMonthlyAttendance,
  getAllMonthlyAttendance,
  getAttendancesByDate,
  updateAttendanceById,
  deleteAttendance,
  getAttendanceById,
} from "@/modules/attendance/services/attendance-service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    // ?email=X&date=Y → その日の全シフト（配列）
    if (email && date) {
      if (session!.user.role !== "admin" && email !== session!.user.email) {
        return NextResponse.json({ error: "他のユーザーのデータにはアクセスできません" }, { status: 403 });
      }
      const data = await getAttendancesByDate(email, date);
      return NextResponse.json(data);
    }

    if (!month) return NextResponse.json([], { status: 400 });

    if (session!.user.role !== "admin" && email && email !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーのデータにはアクセスできません" }, { status: 403 });
    }

    if (email) {
      const data = await getMonthlyAttendance(email, month);
      return NextResponse.json(data);
    } else {
      if (session!.user.role !== "admin") {
        const data = await getMonthlyAttendance(session!.user.email!, month);
        return NextResponse.json(data);
      }
      const data = await getAllMonthlyAttendance(month);
      return NextResponse.json(data);
    }
  } catch (e) {
    console.error("Attendance fetch error:", e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const staffEmail = body.staffEmail;
    if (staffEmail !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーとしての操作はできません" }, { status: 403 });
    }

    // 新形式: { staffEmail, date, shifts: [...] }
    if (body.shifts) {
      const result = await submitAttendanceShifts(staffEmail, body.date, body.shifts);
      return NextResponse.json(result);
    }

    // 旧形式: { staffEmail, data: {...} }（後方互換）
    const result = await submitAttendance(staffEmail, body.data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Attendance submit error:", e);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id, data } = await request.json();
    const existing = await getAttendanceById(id);
    if (!existing) {
      return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });
    }
    if (session!.user.role !== "admin" && existing.staffEmail !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーのデータは編集できません" }, { status: 403 });
    }
    const result = await updateAttendanceById(id, data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Attendance update error:", e);
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
    const existing = await getAttendanceById(id);
    if (!existing) {
      return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });
    }
    if (session!.user.role !== "admin" && existing.staffEmail !== session!.user.email) {
      return NextResponse.json({ error: "他のユーザーのデータは削除できません" }, { status: 403 });
    }
    await deleteAttendance(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Attendance delete error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
